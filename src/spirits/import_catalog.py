"""Extract factual numeric game tables from the identified client XML and move tables."""
import argparse
import json
from pathlib import Path
import struct
import xml.etree.ElementTree as ET
import zlib

PLAYABLE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 27, 28, 29,
              33, 34, 46, 47, 83, 84, 85, 164, 165, 166, 301, 302, 303, 442, 443, 444, 701, 702, 4694]
EXHIBITS = [821, 2197, 4690, 4693]
SAFARI = {
    "field": [10, 16, 574, 690, 553, 249, 414, 164, 738],
    "random": [399, 732, 203, 459, 293, 454, 701, 22],
    "fish": [703, 289, 198, 30, 32, 200, 785, 108, 814],
    "tree": [153, 281, 344, 387, 471, 756, 618, 646, 442, 724],
    "bear": [812],
}
SOURCES = ["https://seer.61.com/dll/RobotCoreDLL.swf",
           "https://github.com/SeerAPI/config-sources/tree/b6fbce626c70ee1e70d3e43137369b668f6d2f37"]
STATS = ["HP", "Atk", "Def", "SpAtk", "SpDef", "Spd"]


def numbers(value):
    if isinstance(value, list):
        return [int(v) for v in value]
    return [int(i) for i in str(value or "").split()]


def read_tables(path):
    """Read public XML resources by their exported SWF symbol names."""
    swf=path.read_bytes()
    if swf[:3] not in (b"CWS",b"FWS"):
        swf=zlib.decompress(swf[7:])
    body=zlib.decompress(swf[8:]) if swf[:3]==b"CWS" else swf[8:]
    offset=(5+4*(body[0]>>3)+7)//8+4
    binary,names={},{}
    while offset+2<=len(body):
        header=struct.unpack_from("<H",body,offset)[0]
        offset+=2
        tag,size=header>>6,header&63
        if size==63:
            size=struct.unpack_from("<I",body,offset)[0]
            offset+=4
        value=body[offset:offset+size]
        offset+=size
        if tag==87:
            binary[struct.unpack_from("<H",value)[0]]=value[6:]
        elif tag==76:
            index=2
            for _ in range(struct.unpack_from("<H",value)[0]):
                symbol=struct.unpack_from("<H",value,index)[0]
                end=value.index(0,index+2)
                names[value[index+2:end].decode().split(".")[-1]]=symbol
                index=end+1
    keys=("PetXMLInfo_xmlClass","TypeXMLInfo_xmlClass","PetBookXMLInfo_xmlClass","SkillXMLInfo_typeClass","NatureXMLInfo_xmlClass","EvolveXMLInfo_xmlcls")
    return {key:ET.fromstring(binary[names[key]]) for key in keys}


def collect(folder,client):
    tables=read_tables(client)
    types = {int(x.get("id")): x.get("cn") for x in tables["SkillXMLInfo_typeClass"]}
    english = {x.get("en"): x.get("cn") for x in tables["SkillXMLInfo_typeClass"]}
    matchups = {english[r.get("type")]: {english[o.get("type")]: float(o.get("multiple"))
               for o in r if o.get("type") in english and o.get("multiple") != "1"}
               for r in tables["TypeXMLInfo_xmlClass"]}
    natures = [[x.get("name"), *[float(x.get(k)) for k in ("m_attack", "m_defence", "m_SA", "m_SD", "m_speed")]] for x in tables["NatureXMLInfo_xmlClass"]]
    monsters = {int(x.get("ID")): x for x in tables["PetXMLInfo_xmlClass"] if x.get("ID")}
    entries = sorted(tables["PetBookXMLInfo_xmlClass"].findall("Monster"), key=lambda x: int(x.get("ID")))
    index, species, wanted = [], {}, set()
    for entry in entries:
        sid = int(entry.get("ID"))
        mon = monsters[sid]
        def measurement(key):
            try:
                value=float(entry.get(key, ""))
                return value if value>0 else None
            except ValueError:
                return None
        index.append([sid, entry.get("DefName"), int(mon.get("Type")), measurement("Height"), measurement("Weight")])
        detail = {"base": [int(mon.get(k)) for k in STATS], "skills": [],
                  "yield": int(mon.get("YieldingExp", 0)), "ev": numbers(mon.get("YieldingEV")),
                  "catch": int(mon.get("CatchRate", 0)), "growth": int(mon.get("GrowthType", 0))}
        for tag, key in [("LearnableMoves", "skills"), ("ExtraMoves", "extra")]:
            learn = [[int(m.get("LearningLv", 0)), int(m.get("ID"))] for m in mon.findall(tag + "/Move") if m.get("ID")]
            if learn:
                detail[key] = learn
                wanted.update(move for _, move in learn)
        if int(mon.get("EvolvesTo") or 0) and int(mon.get("EvolvingLv") or 0) and not int(mon.get("EvolvFlag") or 0):
            detail["evolves"] = [int(mon.get("EvolvingLv")), int(mon.get("EvolvesTo"))]
        species[sid] = detail
    rows = json.loads((folder / "moves.json").read_bytes())["MovesTbl"]["Moves"]["Move"]
    move_table = {int(m["ID"]):m for m in rows}
    unity_path = folder / "moves-unity.json"
    if unity_path.is_file():
        unity = json.loads(unity_path.read_bytes())
        rows = unity["root"]["moves"]["move"]
        for m in rows:
            lookup = {k.lower().replace("_",""): v for k, v in m.items()}
            names = ["ID","Name","Category","Type","Power","MaxPP","Accuracy","Priority","MustHit","CritRate","SideEffect","SideEffectArg","AtkNum","PwrDouble"]
            row = {k:lookup[k.lower()] for k in names if k.lower() in lookup}
            if "Name" in row and row.get("ID") not in move_table: move_table[int(row["ID"])] = row
    moves = {}
    for mid in sorted(wanted & move_table.keys()):
        m = move_table[mid]
        row = [m["Name"], int(m["Category"]), int(m["Type"]), int(m.get("Power",0)), int(m["MaxPP"]), int(m.get("Accuracy",100))]
        if any(m.get(k) for k in ("Priority","MustHit","CritRate","SideEffect")):
            row.extend([int(m.get("Priority",0)),int(m.get("MustHit",0)),int(m.get("CritRate",0))])
            if m.get("SideEffect"):
                row.extend([numbers(m["SideEffect"]),numbers(m.get("SideEffectArg"))])
        extra = {key:int(m[key]) for key in ("AtkNum","PwrDouble") if m.get(key)}
        if extra:
            while len(row)<11:row.append(0)
            row.append(extra)
        moves[mid] = row
    # EvolvFlag points into a separate table. A zero EvolvesTo on these
    # monsters does not mean that they are the last member of their family.
    conditions={int(row.get("ID")): row.findall("Branch") for row in tables["EvolveXMLInfo_xmlcls"]}
    branches={}
    edges={(sid, detail["evolves"][1]) for sid,detail in species.items() if "evolves" in detail}
    for sid in species:
        mon=monsters[sid]
        for branch in conditions.get(int(mon.get("EvolvFlag") or 0), ()):
            target=int(branch.get("MonTo"))
            if target not in species or (sid,target) in edges:continue
            route=dict(target=target,level=int(mon.get("EvolvingLv") or 0),method="chamber")
            if branch.get("EvolvItem"):
                route.update(item=int(branch.get("EvolvItem")),count=int(branch.get("EvolvItemCount")))
            branches.setdefault(sid,[]).append(route)
            edges.add((sid,target))
    # The client also names some relatives without giving a public acquisition
    # rule. Show the relationship without treating it as a free level evolution.
    for sid in species:
        mon=monsters[sid]
        for source,target in ((int(mon.get("EvolvesFrom") or 0),sid),(sid,int(mon.get("EvolvesTo") or 0))):
            if source in species and target in species and source!=target and (source,target) not in edges:
                branches.setdefault(source,[]).append(dict(target=target,method="special"))
                edges.add((source,target))
    resources={r["item"] for paths in branches.values() for r in paths if "item" in r}
    items={}
    for category in json.loads((folder / "items.json").read_bytes())["Items"]["Cat"]:
        rows=category.get("Item",[])
        for item in rows if isinstance(rows,list) else [rows]:
            iid=int(item["ID"])
            if iid in resources:items[iid]=item["Name"]
    playable=set(PLAYABLE)
    frontier={sid for pool in SAFARI.values() for sid in pool}
    while frontier:
        sid=frontier.pop()
        playable.add(sid)
        next_form=species[sid].get("evolves",[0,0])[1]
        previous=int(monsters[sid].get("EvolvesFrom") or 0)
        chamber=[r["target"] for r in branches.get(sid,[]) if r["method"]=="chamber"]
        for link in (next_form, previous, *chamber):
            if link in species and link not in playable:frontier.add(link)
    return dict(sources=SOURCES, playable=sorted(playable), exhibits=EXHIBITS, safari=SAFARI, types=types, matchups=matchups,
                natures=natures, index=index, species=species, moves=moves, missingMoves=sorted(wanted-moves.keys()),
                evolutionBranches=branches,evolutionItems=items)


def write_json(path, data):
    compact=lambda x:json.dumps(x,ensure_ascii=False,separators=(",",":"))
    sections=[]
    for key,value in data.items():
        if key in ("species","moves"):
            body="{\n"+",\n".join("    "+compact(str(k))+":"+compact(v) for k,v in value.items())+"\n  }"
        elif key=="index":
            body="[\n"+",\n".join("    "+compact(v) for v in value)+"\n  ]"
        else:body=compact(value)
        sections.append("  "+compact(key)+":"+body)
    path.write_text("{\n"+",\n".join(sections)+"\n}\n",encoding="utf-8")


if __name__ == "__main__":
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("folder",type=Path)
    cli.add_argument("--client",required=True,type=Path,help="Taomee RobotCoreDLL.swf")
    cli.add_argument("output",type=Path)
    args=cli.parse_args()
    data=collect(args.folder,args.client);write_json(args.output,data)
    print("species",len(data["index"]),"moves",len(data["moves"]),"undefined move IDs",len(data["missingMoves"]))
