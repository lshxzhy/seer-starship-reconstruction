"""Serve the playable ship and character conversations through local Ollama.

Python standard library only. No model download, tool execution or chat logging.
Run from any directory: python src/ai/server.py --open
"""
from __future__ import annotations

import argparse
from functools import lru_cache
from http.client import HTTPConnection, HTTPException, HTTPSConnection
import json
import os
from pathlib import Path
import re
import select
import socket
import shutil
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import webbrowser


PROJECT = Path(__file__).resolve().parents[2]
CATALOG = Path(__file__).with_name('characters.json')
SPIRIT_CATALOG = PROJECT / 'src' / 'spirits' / 'catalog.json'
DEFAULT_MODEL = 'qwen3.5:9b'
THINKING = False
CONTEXT_SIZE = 8192
PROMPT_BUDGET = 4608
SERVICE = 'seer-crew'
SCHEMA_VERSION = 2
ROOMS = {
    'teleport': '传送舱', 'captain': '船长室', 'laboratory': '实验室',
    'archives': '资料室', 'instructor': '教官办公室', 'honors': '荣誉大厅',
    'power': '动力室', 'machine': '机械室', 'workshop': '发明室',
    'observation': '瞭望舱', 'terraceAccess': '瞭望露台',
}


class BridgeError(Exception):
    def __init__(self, status: int, message: str):
        self.status, self.message = status, message
        super().__init__(message)


def loopback_base(value):
    """Normalize a local Ollama listen address to a local client address."""
    parsed = urlsplit(value if '://' in value else 'http://' + value)
    if (parsed.scheme not in ('http', 'https') or parsed.username is not None or
            parsed.password is not None or parsed.path not in ('', '/') or parsed.query or parsed.fragment):
        raise ValueError('Ollama 地址应为本机 HTTP(S) 服务的地址与端口。')
    aliases = {'localhost': '127.0.0.1', '127.0.0.1': '127.0.0.1',
               '0.0.0.0': '127.0.0.1', '::1': '[::1]', '::': '[::1]'}
    host = aliases.get(parsed.hostname)
    if not host:
        raise ValueError('舰上通讯需要本机 Ollama，请使用环回地址。')
    return urlsplit(f'{parsed.scheme}://{host}:{parsed.port or 11434}')


def connection_for(base, timeout):
    connection = HTTPSConnection if base.scheme == 'https' else HTTPConnection
    return connection(base.hostname, base.port, timeout=timeout)


def read_catalog():
    try:
        data = json.loads(CATALOG.read_text(encoding='utf-8'))
    except (ValueError, OSError) as exc:
        raise BridgeError(503, '角色名册不可读，请重新构建本地项目。') from exc
    if not isinstance(data, dict) or not isinstance(data.get('characters'), list):
        raise BridgeError(503, '角色名册未准备好。')
    return data


def upstream_json(base, path, payload=None, timeout=8):
    # Direct loopback sockets do not inherit system HTTP proxies or follow redirects.
    conn = connection_for(base, timeout)
    try:
        body = json.dumps(payload).encode() if payload is not None else None
        conn.request('POST' if body else 'GET', path, body, {'Content-Type': 'application/json'})
        with conn.getresponse() as response:
            if response.status != 200:
                raise BridgeError(502, f'Ollama 请求失败（HTTP {response.status}）。')
            value = json.load(response)
            if not isinstance(value, dict):
                raise ValueError('Expected a JSON object')
            return value
    except (HTTPException, ValueError) as exc:
        raise BridgeError(502, '本机 Ollama 返回了无效的响应。') from exc
    except OSError as exc:
        raise BridgeError(503, '暂时无法连接本机 Ollama，请确认 Ollama 正在运行。') from exc
    finally:
        conn.close()


def available_models(base, selected):
    installed = upstream_json(base, '/api/tags').get('models', [])
    candidate = next((m for m in installed if isinstance(m, dict) and m.get('name') == selected), None)
    if candidate is None:
        return []
    info = upstream_json(base, '/api/show', {'model': selected})
    if (info.get('remote_model') or info.get('remote_host') or candidate.get('remote_model') or
            'completion' not in (info.get('capabilities') or [])):
        return []
    return [{'name': selected, 'size': candidate.get('size'),
             'parameters': (candidate.get('details') or {}).get('parameter_size')}]


def start_local_ollama(base):
    """The play launcher can bring up an installed local runner without downloading models."""
    if base.scheme != 'http':
        return
    try:
        upstream_json(base, '/api/version', timeout=2)
        return
    except BridgeError:
        pass
    executable = shutil.which('ollama')
    if not executable:
        return
    try:
        process = subprocess.Popen(
            [executable, 'serve'], env={**os.environ, 'OLLAMA_HOST': base.netloc},
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
            start_new_session=os.name != 'nt')
    except OSError:
        return
    for _ in range(24):
        time.sleep(.25)
        try:
            upstream_json(base, '/api/version', timeout=.8)
            return
        except BridgeError:
            if process.poll() is not None:
                return


@lru_cache(maxsize=1)
def spirit_catalog():
    try:
        data = json.loads(SPIRIT_CATALOG.read_text(encoding='utf-8'))
        entries = {int(row[0]): row for row in data['index']}
        moves = data['moves']
        sources = [{'title': '淘米页游客户端参数' if url.startswith('https://seer.61.com/') else '技能参数表',
                    'url': url} for url in data.get('sources', []) if isinstance(url, str) and url.startswith('https://')]
        return entries, data['species'], moves, frozenset(row[0] for row in moves.values()), sources, data['types']
    except (OSError, ValueError, TypeError, IndexError, KeyError) as exc:
        raise BridgeError(503, '精灵图鉴暂不可读，请使用完整的本机游戏目录。') from exc


def spirit_character(identifier):
    number = int(identifier.split(':', 1)[1])
    entries, species, moves, _, sources, types = spirit_catalog()
    record = entries.get(number)
    if not record:
        raise BridgeError(404, '本版图鉴尚无这个精灵编号。')
    _, name, type_id, *measurements = record
    ability = species.get(str(number), {})
    learnset = [(level, moves[str(move)][0]) for level, move, *_ in ability.get('skills', [])
                if str(move) in moves]
    evolution = ability.get('evolves')
    next_form = None
    if isinstance(evolution, list) and len(evolution) == 2 and evolution[1] in entries:
        next_form = [evolution[0], entries[evolution[1]][1]]
    return {'id': identifier, 'kind': 'spirit', 'number': number, 'name': name,
            'element': types.get(str(type_id), ''), 'learnset': learnset, 'evolution': next_form,
            'measurements': measurements, 'sources': sources}


def spirit_prompt(character, context):
    number = character['number']
    if type(context.get('speciesId')) is not int or context['speciesId'] != number:
        raise BridgeError(400, '遇见的精灵与通讯对象不一致，请重新打开精灵通讯。')
    bond = context.get('bond')
    encounters = {'wild': '玩家正在野外观察这只精灵', 'owned': '这只精灵是玩家已获得的伙伴',
                  'dex': '这是玩家在图鉴中发起的模拟交流，不能据此判定是否已遇见或持有该个体'}
    if bond not in encounters:
        raise BridgeError(400, '请选择图鉴、野外或伙伴中的精灵再发起通讯。')
    prompt = [
        f'你扮演经典页游《赛尔号》图鉴 {number:03d} 号的{character["name"]}。'
        f'图鉴登记属性是{character["element"] or "未知"}。{encounters[bond]}。',
        '用简短的中文描写这只精灵的动作或叫声，再用一句第一人称的意译回答玩家。'
        '这是本项目的精灵行为演绎。未给出的原作剧情、战绩、捕捉条件、技能效果不要编造。'
        '通讯只能交流。捕捉、战斗、升级、治疗、兑换等操作由游戏界面完成；不要宣称已执行这些操作。'
    ]
    facts = {}
    for key, amount in zip(('图鉴身高（厘米）', '图鉴体重（千克）'), character['measurements']):
        if type(amount) in (int, float) and amount > 0:
            facts[key] = amount
    if character['learnset']:
        facts['部分可学招式（所需等级、名称）'] = [list(move) for move in character['learnset'][:5]]
    if character['evolution']:
        facts['本系统记录的进化（等级、形态）'] = character['evolution']
    location = context.get('location')
    if isinstance(location, str) and location.strip():
        facts['玩家的位置'] = location.strip()[:64]
    if bond != 'dex':
        level, hp, max_hp = (context.get(key) for key in ('level', 'hp', 'maxHp'))
        if type(level) is int and 1 <= level <= 100:
            facts['等级'] = level
        if type(hp) is int and type(max_hp) is int and 0 <= hp <= max_hp <= 100000:
            facts['当前体力/上限'] = f'{hp}/{max_hp}'
        moves = context.get('moves')
        if isinstance(moves, list):
            # A prior form's learned move may remain after evolution.
            known_moves = spirit_catalog()[3]
            names = [s for s in moves[:4] if isinstance(s, str) and s in known_moves]
            if names:
                facts['当前招式'] = names
    if facts:
        prompt.append('以下 JSON 是图鉴及本局状态数据：' + json.dumps(facts, ensure_ascii=False))
    return prompt


def make_messages(character, catalog, history, context):
    if not isinstance(history, list) or not history:
        raise BridgeError(400, '请先输入要对角色说的话。')
    turns = []
    for message in history[-16:]:
        if not isinstance(message, dict) or message.get('role') not in ('user', 'assistant'):
            raise BridgeError(400, '会话只能包含玩家与角色的消息。')
        content = message.get('content')
        if not isinstance(content, str) or len(content) > 8000:
            raise BridgeError(400, '单条消息需为文字，且不超过 8,000 字符。')
        if content.strip():
            turns.append({'role': message['role'], 'content': content.strip()})
    if not turns or turns[-1]['role'] != 'user':
        raise BridgeError(400, '会话最后一条应是玩家的问题。')
    context = context if isinstance(context, dict) else {}
    if character.get('kind') == 'spirit':
        prompt = spirit_prompt(character, context)
    else:
        prompt = crew_prompt(character, catalog, context, turns[-1]['content'])
    return bounded_messages(prompt, turns)


def crew_prompt(character, catalog, context, question):
    room_id = context.get('roomId') if isinstance(context.get('roomId'), str) else None
    player_room = ROOMS.get(room_id, '舰内公共区域')
    departments = {group['id']: group['name'] for group in catalog['organization']}
    if character.get('generic'):
        contact = context.get('nearby') or {}
        if not isinstance(contact, dict):
            raise BridgeError(400, '船员编号或岗位信息无效。')
        number = context.get('crewId') or contact.get('id')
        if (not isinstance(number, str) or not re.fullmatch(r'SE-[0-9]{5}', number) or
                not 2 <= int(number[3:]) <= 12000 or contact.get('id') not in (None, number)):
            raise BridgeError(400, '请选择一名已遇见的船员。')
        role = str(contact.get('role') or '船员')[:80]
        zone = str(contact.get('zone') or '未登记')[:80]
        channel = '你正在玩家身边' if context.get('contactInRange') is True else '你在远程通讯'
        identity = f'你是普通赛尔船员，编号 {number}，当前岗位是{role}，岗位区域是{zone}。{channel}。'
    else:
        workplace = ROOMS.get(character.get('roomId'), '舰外通讯')
        identity = (f"你是{character['name']}，职务是{character['title']}。"
                    f"本项目所属部门为{departments[character['departmentId']]}，工位为{workplace}，"
                    "正通过舰上通讯与玩家交谈。")
    prompt = [identity, f'玩家在{player_room}。用中文第一人称直接回答当前问题，通常一至三句。',
              '背景为经典页游《赛尔号》。原作未确定的事如实说明；你只能交谈。']
    ship = next((group for group in catalog['organization'] if group['id'] == 'seer'), None)
    if ship:
        prompt.append('赛尔号：' + ship['description'])
    if not character.get('generic'):
        prompt.append(character['persona'].replace('项目创作风格：', '语气：', 1))
        prompt.append('已知原作资料：' + ''.join(character['facts']))

    others = [c for c in catalog['characters'] if not c.get('generic') and c['id'] != character['id']]
    if (re.search(r'组织|架构|编制|部门|汇报|归谁管|哪些人|其他船员|谁负责|找谁|先锋队|SPT', question, re.I)
            or any(c['name'] in question for c in others)):
        entries = [f"{c['name']}（{c['title']}，{ROOMS.get(c.get('roomId'), '舰外')}）"
                   for c in catalog['characters'] if not c.get('generic')]
        prompt.append('本项目按职能联络，不代表原作确认的汇报线。名册：' + '、'.join(entries) + '。')
        spt = next((g for g in catalog['organization'] if g['id'] == 'spt'), None)
        if spt:
            prompt.append(spt['description'])
    return prompt


def bounded_messages(prompt, turns):
    system = {'role': 'system', 'content': '\n'.join(prompt)}
    latest = turns[-1]
    # A UTF-8 byte bound is conservative for this byte-level tokenizer.
    # Leave room for the chat template and the generated reply.
    def cost(message):
        return len(message['content'].encode('utf-8')) + 32

    remaining = PROMPT_BUDGET - cost(system) - cost(latest)
    if remaining < 0:
        raise BridgeError(400, '这条问题超过当前会话的输入预算。请缩短问题或分两条发送。')
    pairs = []
    for index in range(len(turns) - 2, 0, -1):
        user, answer = turns[index - 1], turns[index]
        if user['role'] != 'user' or answer['role'] != 'assistant':
            continue
        pair_cost = cost(user) + cost(answer)
        if pair_cost > remaining:
            break
        remaining -= pair_cost
        pairs.append((user, answer))
    history_messages = [message for pair in reversed(pairs) for message in pair]
    return [system, *history_messages, latest]


class CrewServer(ThreadingHTTPServer):
    # Windows SO_REUSEADDR can allow two listeners on a live port. The original
    # listener must keep its clients when the launcher is double-clicked again.
    allow_reuse_address = os.name != 'nt'

    def server_bind(self):
        if os.name == 'nt':
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


class CrewHandler(BaseHTTPRequestHandler):
    server_version = 'SeerCrew/1.0'
    timeout = 30

    def log_message(self, *_):
        # Do not persist conversations or put user input in access logs.
        pass

    def parse_request(self):
        if not super().parse_request():
            return False
        hosts = self.headers.get_all('Host', [])
        origins = self.headers.get_all('Origin', [])
        if (len(hosts) != 1 or hosts[0].lower() not in self.server.allowed_hosts or
                (origins and origins != ['http://' + hosts[0].lower()])):
            self._json(403, {'error': '请在本机登舰通讯页使用此接口。'})
            return False
        if self.path.startswith('/api/') and self.headers.get('Sec-Fetch-Site') in ('cross-site', 'same-site'):
            self._json(403, {'error': '请在本机登舰通讯页使用此接口。'})
            return False
        return True

    def _headers(self, status, content_type, length=None):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "frame-ancestors 'none'")
        if length is not None:
            self.send_header('Content-Length', str(length))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.close_connection = True

    def _json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self._headers(status, 'application/json; charset=utf-8', len(body))
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._headers(204, 'text/plain', 0)

    def do_GET(self):
        path = self.path.partition('?')[0]
        try:
            if path == '/api/catalog':
                self._json(200, read_catalog())
            elif path == '/api/health':
                try:
                    info = upstream_json(self.server.ollama, '/api/version', timeout=2)
                    reachable, version = True, info.get('version')
                except BridgeError:
                    reachable, version = False, None
                self._json(200, {'ok': True, 'service': SERVICE, 'schemaVersion': SCHEMA_VERSION,
                                 'ollamaAvailable': reachable, 'thinking': THINKING, 'spiritChat': True,
                                 'model': self.server.model, 'ollamaVersion': version})
            elif path == '/api/models':
                models = available_models(self.server.ollama, self.server.model)
                self._json(200, {'models': models, 'selected': self.server.model})
            elif path == '/':
                self.send_response(302)
                self.send_header('Location', '/play')
                self.send_header('Content-Length', '0')
                self.end_headers()
            elif path in ('/play', '/play/'):
                # Serve the real scene directly on loopback so local inference
                # does not depend on an opaque file/srcdoc iframe's fetch rules.
                fragment = (PROJECT / 'work' / 'seer-fragment.html').read_text(encoding='utf-8')
                css = (PROJECT / 'work' / 'standalone.css').read_text(encoding='utf-8')
                body = ('<!doctype html><html lang="zh-CN"><meta charset="utf-8">'
                        '<meta name="viewport" content="width=device-width,initial-scale=1">'
                        '<title>SEER · 舰上通讯</title><style>' + css + '</style><body>' +
                        fragment + '</body></html>').encode('utf-8')
                self._headers(200, 'text/html; charset=utf-8', len(body))
                self.wfile.write(body)
            elif path == '/favicon.ico':
                self._headers(204, 'image/x-icon', 0)
            else:
                self._json(404, {'error': '没有这个入口。'})
        except BridgeError as exc:
            self._json(exc.status, {'error': exc.message})
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass
        except (OSError, ValueError, KeyError):
            self._json(503, {'error': '项目资料暂不可读，请从项目入口重新启动舰上通讯。'})

    def do_POST(self):
        if self.path.partition('?')[0] != '/api/chat':
            self._json(404, {'error': '没有这个入口。'})
            return
        try:
            if self.headers.get_content_type() != 'application/json':
                raise BridgeError(415, '角色对话须使用 JSON 消息。')
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 131072:
                raise BridgeError(413, '消息过大或为空。')
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise BridgeError(400, '请求应为一个消息对象。')
            identifier = data.get('characterId')
            if isinstance(identifier, str) and re.fullmatch(r'spirit:[1-9]\d{0,5}', identifier):
                catalog = None
                character = spirit_character(identifier)
            else:
                catalog = read_catalog()
                character = next((c for c in catalog['characters'] if c['id'] == identifier), None)
                if character is None:
                    raise BridgeError(404, '未找到这个角色，请刷新角色名册。')
            model = data.get('model') or self.server.model
            if model != self.server.model:
                raise BridgeError(400, '模型须与舰上通讯启动时选定的模型一致。')
            messages = make_messages(character, catalog, data.get('messages'), data.get('context'))
            if not available_models(self.server.ollama, model):
                raise BridgeError(503, f'请确认本机 Ollama 已安装可对话的本地模型 {model}。')
            if not self.server.inference.acquire(timeout=.7):
                raise BridgeError(409, '另一个角色正在回复，请稍后再发送。')
        except BridgeError as exc:
            self._json(exc.status, {'error': exc.message})
            return
        except (ValueError, UnicodeError, KeyError, TypeError):
            self._json(400, {'error': '消息格式不完整，请重新发送。'})
            return

        try:
            self._headers(200, 'application/x-ndjson; charset=utf-8')
            self.emit({'type': 'status', 'phase': 'loading'})
            self.stream_chat(model, character, messages)
        except (BridgeError, HTTPException, OSError, ValueError, TypeError) as exc:
            try:
                self.emit({'type': 'error', 'message': getattr(exc, 'message',
                           '本地模型连接已中断，请重新发送。')})
            except OSError:
                pass
        finally:
            self.server.inference.release()

    def emit(self, event):
        self.wfile.write((json.dumps(event, ensure_ascii=False) + '\n').encode('utf-8'))
        self.wfile.flush()

    def stream_chat(self, model, character, messages):
        # Detect a cancelled browser request even during a long cold model load,
        # when there are no upstream tokens and no writes on the browser socket.
        conn = connection_for(self.server.ollama, 8)
        done = threading.Event()
        watcher = None
        try:
            conn.connect()
            upstream_socket = conn.sock
            upstream_socket.settimeout(240)

            def watch_disconnect():
                while not done.is_set():
                    try:
                        readable, _, _ = select.select([self.connection], [], [], .15)
                        if not readable:
                            continue
                        # This is the final request on this HTTP connection.
                        if self.connection.recv(1, socket.MSG_PEEK):
                            done.wait(.15)
                            continue
                    except OSError:
                        pass
                    try:
                        upstream_socket.shutdown(socket.SHUT_RDWR)
                    except OSError:
                        pass
                    return

            watcher = threading.Thread(target=watch_disconnect, daemon=True)
            watcher.start()
            # This project's dialogue preference applies only to this request.
            payload = {'model': model, 'messages': messages, 'stream': True, 'think': THINKING,
                       'options': {'num_ctx': CONTEXT_SIZE}}
            conn.request('POST', '/api/chat', json.dumps(payload, ensure_ascii=False).encode('utf-8'),
                         {'Content-Type': 'application/json'})
            with conn.getresponse() as response:
                if response.status != 200:
                    raise BridgeError(502, f'Ollama 生成请求失败（HTTP {response.status}）。')
                has_answer = False
                for line in response:
                    if not line.strip():
                        continue
                    packet = json.loads(line)
                    if not isinstance(packet, dict) or packet.get('error'):
                        raise BridgeError(502, 'Ollama 未能生成回复，请确认本机模型状态。')
                    message = packet.get('message') or {}
                    if not isinstance(message, dict):
                        raise BridgeError(502, 'Ollama 返回的消息格式无效。')
                    content = message.get('content')
                    if isinstance(content, str) and content:
                        has_answer = has_answer or bool(content.strip())
                        self.emit({'type': 'token', 'content': content})
                    if packet.get('done'):
                        if not has_answer and packet.get('done_reason') == 'length':
                            raise BridgeError(502, '这次请求用尽了上下文，还未返回正文。请新开会话，用一个较短的问题重试。')
                        if not has_answer:
                            raise BridgeError(502, '模型没有返回对话正文，请重试。')
                        self.emit({'type': 'done', 'model': model, 'characterId': character['id'],
                                   'sources': character.get('sources', []),
                                   'metrics': {'evalCount': packet.get('eval_count'),
                                               'totalDuration': packet.get('total_duration')}})
                        return
                raise BridgeError(502, '模型连接在回复完成前中断。')
        finally:
            done.set()
            if watcher:
                watcher.join()
            conn.close()


def main():
    parser = argparse.ArgumentParser(description='SEER 本地角色通讯，使用已安装的 Ollama 模型')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--ollama', default=os.environ.get('OLLAMA_HOST', 'http://127.0.0.1:11434'))
    parser.add_argument('--model', default=DEFAULT_MODEL)
    parser.add_argument('--open', action='store_true', help='在默认浏览器打开登舰通讯版')
    parser.add_argument('--no-build', action='store_true', help='使用已经生成的模型')
    args = parser.parse_args()
    try:
        ollama = loopback_base(args.ollama)
    except ValueError as exc:
        parser.error(str(exc))
    if not 1 <= args.port <= 65535:
        parser.error('登舰通讯端口应在 1 至 65535 之间。')
    base = urlsplit(f'http://127.0.0.1:{args.port}')
    address = base.geturl() + '/play'
    try:
        server = CrewServer(('127.0.0.1', args.port), CrewHandler)
    except OSError as exc:
        if args.open:
            try:
                health = upstream_json(base, '/api/health', timeout=4)
            except BridgeError:
                health = {}
            if health.get('service') == SERVICE and health.get('schemaVersion') != SCHEMA_VERSION:
                raise SystemExit('旧版舰上通讯仍在使用此端口。关闭旧的舰上通讯，再启动本版即可联系精灵。')
            if health.get('service') == SERVICE and health.get('schemaVersion') == SCHEMA_VERSION:
                if health.get('model') != args.model:
                    raise SystemExit('此端口上的舰上通讯已使用其他模型，请关闭旧服务或选择另一端口。')
                if health.get('thinking') is not THINKING:
                    raise SystemExit('此端口上的旧版舰上通讯使用不同的思考设置。请关闭旧服务后再启动。')
                if not health.get('ollamaAvailable'):
                    start_local_ollama(ollama)
                webbrowser.open(address)
                print('已打开正在运行的舰上通讯：' + address, flush=True)
                return
        raise SystemExit('本地通讯端口不可用，请关闭旧进程或用 --port 指定端口。') from exc
    try:
        if not args.no_build:
            subprocess.run([sys.executable, str(PROJECT / 'work' / 'assemble-seer.py')],
                           cwd=PROJECT, check=True)
        read_catalog()
        server.daemon_threads = True
        server.ollama, server.model = ollama, args.model
        server.inference = threading.BoundedSemaphore(1)
        server.allowed_hosts = {f'127.0.0.1:{args.port}', f'localhost:{args.port}'}
        if args.port == 80:
            server.allowed_hosts.update(('127.0.0.1', 'localhost'))
        print('舰上通讯：' + address, flush=True)
        print('舰上通讯使用 ' + args.model + '，思考已关闭。关闭此进程即可停止。', flush=True)
        if args.open:
            start_local_ollama(ollama)
            webbrowser.open(address)
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
