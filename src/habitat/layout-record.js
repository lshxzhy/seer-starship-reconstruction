  // Keep a machine-readable copy of the installed layout next to its viewer.
  // The offline plan drawing is produced from this same installed geometry.
  const layoutRecord=document.createElement('script');
  layoutRecord.type='application/json';
  layoutRecord.dataset.installedPlan='';
  layoutRecord.textContent=JSON.stringify(habitat.plan);
  root.appendChild(layoutRecord);
