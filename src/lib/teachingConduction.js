export const TEACHING_CONDUCTION_STAGES = [
  {
    id: 'sa',
    start: 0,
    end: 0.055,
    label: 'SA node initiation',
    structures: 'SA node',
    note: 'The SA node reaches threshold and initiates the cardiac cycle.',
  },
  {
    id: 'atria',
    start: 0.055,
    end: 0.18,
    label: 'Atrial activation',
    structures: "Right atrium, Bachmann's bundle, and left atrium",
    note: 'Excitation spreads through right atrial myocardium and crosses to the left atrium through Bachmann’s bundle.',
  },
  {
    id: 'av',
    start: 0.18,
    end: 0.34,
    label: 'AV nodal delay',
    structures: 'AV node',
    note: 'Slow AV nodal conduction delays ventricular activation and permits ventricular filling.',
  },
  {
    id: 'his',
    start: 0.34,
    end: 0.40,
    label: 'His bundle activation',
    structures: 'Bundle of His',
    note: 'The His bundle carries excitation through the fibrous skeleton toward the interventricular septum.',
  },
  {
    id: 'purkinje',
    start: 0.40,
    end: 0.49,
    label: 'Bundle branch and Purkinje activation',
    structures: 'Right and left bundle branches and Purkinje fibers',
    note: 'Excitation travels rapidly down the bundle branches toward the apex, then spreads through Purkinje fibers across the ventricular endocardium.',
  },
  {
    id: 'ventricles',
    start: 0.49,
    end: 0.66,
    label: 'Ventricular myocardial activation',
    structures: 'Interventricular septum and right and left ventricular myocardium',
    note: 'Excitation spreads through the septum and ventricular walls from early endocardial activation sites, with much of the visible progression toward the base.',
  },
  {
    id: 'repolarization',
    start: 0.66,
    end: 0.90,
    label: 'Ventricular repolarization',
    structures: 'Ventricular myocardium',
    note: 'Regions recover at different times because both activation time and local action potential duration determine when repolarization occurs.',
  },
  {
    id: 'rest',
    start: 0.90,
    end: 1,
    label: 'Electrical diastole',
    structures: 'Atrial and ventricular myocardium',
    note: 'Working myocardium has returned to its resting membrane potential while the SA node approaches its next discharge.',
  },
]

export function getTeachingConductionStage(timeMs, cycleMs) {
  const rawFraction = cycleMs > 0 ? timeMs / cycleMs : 0
  const fraction = rawFraction - Math.floor(rawFraction)
  return TEACHING_CONDUCTION_STAGES.find(stage => fraction >= stage.start && fraction < stage.end)
    || TEACHING_CONDUCTION_STAGES[TEACHING_CONDUCTION_STAGES.length - 1]
}
