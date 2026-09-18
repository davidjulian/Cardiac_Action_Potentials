# Cardiac Action Potentials Lab

An interactive teaching app for undergraduate biomedical engineering students studying cardiac action potentials, excitation contraction coupling, autonomic regulation, extracellular ions, and cardiac conduction.

This focused version is derived from the PCB3713C ECG Learning Platform and contains only the sections used by the cardiac action potentials laboratory:

- 1: cardiac anatomy
- 2: action potentials by cell type
- 3: cardiac conduction

The app opens directly without authentication so students can keep it beside a Canvas New Quiz.

## New excitation contraction displays

Atrial and ventricular panels show three synchronized teaching traces:

1. Intracellular membrane potential
2. Relative cytosolic calcium
3. Relative twitch force

The model represents this causal sequence:

`ICa-L → trigger calcium → SR calcium release → cytosolic calcium → troponin activation → force`

SA nodal and Purkinje panels do not display pumping force because these tissues are specialized primarily for electrical activity and conduction.

## Model scope

The simulations are qualitative, phenomenological teaching models rather than research or clinical models. They are designed to preserve the following relationships:

- Increased beta-1 adrenergic tone increases pacemaker rate, trigger calcium, twitch force, and relaxation rate.
- Increased M2 cholinergic tone hyperpolarizes nodal cells, reduces phase 4 slope, and slows AV conduction, with little direct ventricular effect.
- Hyperkalemia makes resting membrane potential less negative, reduces fast sodium channel availability, and slows phase 0.
- Hypokalemia makes resting membrane potential more negative while reducing important repolarizing potassium currents.
- Low extracellular calcium reduces force while prolonging the plateau through weaker calcium dependent inactivation.
- High extracellular calcium increases force while shortening the plateau through stronger calcium dependent inactivation.

Force is normalized to the ventricular baseline condition at 20% sympathetic tone, 20% parasympathetic tone, 4.0 mEq/L extracellular potassium, and 9.5 mg/dL extracellular calcium. Values are relative and should not be interpreted as newtons, ventricular pressure, or whole heart work.

## Run locally

This project requires Node.js 20.19 or newer.

```bash
npm ci
npm run dev
```

Create a production build with:

```bash
npm run build
```

## GitHub Pages

The included workflow builds and deploys the app when the `main` branch is updated. The Vite asset base is relative, so the same build can be published from any repository name.

In the repository settings, set Pages to use **GitHub Actions** as its source.

## Attribution and permission

The original application was developed by jwalker2124 for PCB3713C. Confirm redistribution and modification permission with the original author and add the agreed software license before public release.
