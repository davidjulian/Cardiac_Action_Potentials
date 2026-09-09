# Teaching model notes

## Action potentials

The action potentials are generated from piecewise smooth waveforms. The controls alter timing and shape parameters rather than integrating a full system of ionic differential equations.

The ventricular and atrial models represent:

- Phase 4: stable resting potential dominated by `IK1`
- Phase 0: fast sodium dependent upstroke
- Phase 1: transient outward potassium current
- Phase 2: inward `ICa-L` balanced by outward potassium current
- Phase 3: repolarization dominated by `IKr` and `IKs`

The nodal model represents an `If` and `ICa-T` dependent phase 4, an `ICa-L` dependent upstroke, and potassium dependent repolarization. Extracellular potassium shifts the SA node maximum diastolic potential in the same direction that it shifts potassium equilibrium potential.

Displayed activation follows this sequence: SA node, atrial myocardium, AV node, His bundle, bundle branches, Purkinje fibers, and ventricular myocytes. Traces are shown only for the SA node, atrial myocytes, Purkinje fibers, and ventricular myocytes.

Channel indicators group the underlying qualitative activity values into three teaching categories: minimal, contributing, and dominant. They indicate relative current contribution, not measured open probability or conductance.

## Calcium transient

The normalized calcium waveform begins at the start of phase 2 and uses a difference shaped transient:

```text
C(t) = Aca × (1 - exp(-t / tau_rise)) × exp(-t / tau_decay)
```

The waveform is normalized before the amplitude factor is applied. `Aca` is modified by:

- beta-1 adrenergic tone
- extracellular calcium
- extracellular potassium at concentrations that impair the action potential
- a modest atrial vagal effect
- cell type

Sympathetic tone also shortens calcium decay to represent faster calcium reuptake and positive lusitropy.

## Relative twitch force

Peak force is a saturating Hill function of peak cytosolic calcium:

```text
Fpeak = Cpeak^n / (Kd^n + Cpeak^n)
```

The ventricular baseline is normalized to 100%. The force waveform begins after the calcium transient and uses slower activation and decay constants. Atrial calcium and force transients are smaller and shorter than ventricular transients.

## Important limitations

- The model does not calculate individual ionic currents from channel gating equations.
- The calcium transient does not explicitly simulate L type channel gating, ryanodine receptors, SERCA, phospholamban, NCX, or cytosolic buffers.
- Force does not simulate sarcomere length, preload, afterload, force velocity behavior, or ventricular pressure.
- Conduction does not calculate propagation from gap junction resistance or tissue geometry.
- Numerical outputs are for comparisons within the activity and are not clinical predictions.
