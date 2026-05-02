#!/usr/bin/env python3
"""
Preprocessor for CLOUDY cooling simulation output.
Reads .lambda, .ovr, .lines, .tim, and (optionally) .contin files
and writes cooling_data.json + per-model Float32 binary files for the web demo.

Run from the website root:
    python3 demo_data/process_cloudy_data.py
"""

import json
import os
import sys
import numpy as np

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(BASE_DIR, "cooling_data.json")

# Known line wavelengths (Angstroms) from linelist.dat, with display labels
LINELIST = [
    ("OVI_1032",  1031.91,  "O VI 1032Å"),
    ("OVI_1038",  1037.61,  "O VI 1038Å"),
    ("FeX_6375",  6374.53,  "Fe X 6375Å"),
    ("FeVII_9508",  95076.3,  "Fe VII 9.51μm"),
    ("MgVII_9031",  90309.4,  "Mg VII 9.03μm"),
    ("FeVIII_5445",  54451.4,  "Fe VIII 5.45μm"),
    ("SIV_10508", 105076.0,  "S IV 10.5μm"),
    ("NeVI_76502", 76501.9,  "Ne VI 7.65μm"),
    ("NeII_12810", 128101.0, "Ne II 12.8μm"),
    ("NeIII_15551", 155509.0, "Ne III 15.6μm"),
    ("NeV_14318", 143178.0,  "Ne V 14.3μm"),
]

# Column indices in .lines file (0-based, after depth column)
# Header: #depth  Ne6  Ne5  Ne2  Ne3  Fe8  Fe7  Mg7  S4  O6_1032  O6_1038  Fe10
LINES_COL = {
    "NeVI_76502":   1,
    "NeV_14318":    2,
    "NeII_12810":   3,
    "NeIII_15551":  4,
    "FeVIII_5445":  5,
    "FeVII_9508":   6,
    "MgVII_9031":   7,
    "SIV_10508":    8,
    "OVI_1032":     9,
    "OVI_1038":     10,
    "FeX_6375":     11,
}

# Models to look for: (key, directory_name, stem)
MODELS = [
    ("cp-cie", "cp-cie-z03", "cp-cool-cie"),
    ("cp-nei", "cp-nei-z03", "cp-cool-nei"),
    ("cd-cie", "cd-cie-z03", "cd-cool-cie"),
    ("cd-nei", "cd-nei-z03", "cd-cool-nei"),
]

METALLICITIES = [0.3]   # will grow as more models are added


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_small(path, usecols=None, delimiter=None):
    """Load a small CLOUDY file with np.loadtxt.
    All lines starting with '#' (header + '###' separators) are skipped."""
    return np.loadtxt(path, comments="#", usecols=usecols, delimiter=delimiter)


# ---------------------------------------------------------------------------
# Per-model processing
# ---------------------------------------------------------------------------

def process_model(model_dir, stem, metallicity):
    """Process one set of CLOUDY output files and return a dict."""
    lam_path    = os.path.join(model_dir, stem + ".lambda")
    ovr_path    = os.path.join(model_dir, stem + ".ovr")
    lines_path  = os.path.join(model_dir, stem + ".lines")
    tim_path    = os.path.join(model_dir, stem + ".tim")
    contin_path = os.path.join(model_dir, stem + ".contin")

    for p in [lam_path, ovr_path, lines_path, tim_path]:
        if not os.path.exists(p):
            print(f"  Missing: {p}")
            return None

    print(f"  Loading small files …")
    # .lambda has text cooling-fraction labels after col 4; use tab delimiter + usecols
    lam_data   = load_small(lam_path,   usecols=(0,1,2,3,4), delimiter='\t')
    ovr_data   = load_small(ovr_path)    # (N, cols): col3=hden, col4=eden
    lines_data = load_small(lines_path)  # (N, cols): col1..11 = line emissivities
    tim_data   = load_small(tim_path)    # (N, cols): col0=elapsed time

    n = lam_data.shape[0]
    print(f"  {n} timesteps")

    T     = lam_data[:, 1].tolist()          # temperature K
    Ctot  = lam_data[:, 3]                   # cooling rate erg/cm³/s
    nH    = ovr_data[:, 3]                   # hydrogen density cm⁻³
    ne    = ovr_data[:, 4]                   # electron density cm⁻³
    time  = tim_data[:, 0].tolist()          # elapsed time s

    # Cooling function Λ = Ctot / (ne * nH)
    with np.errstate(divide="ignore", invalid="ignore"):
        lam_func = np.where(ne * nH > 0, Ctot / (ne * nH), 0.0)

    # Emission lines (erg/cm³/s), indices are 1-based in .lines columns
    line_arrays = {}
    for key, col in LINES_COL.items():
        line_arrays[key] = lines_data[:, col].tolist()

    result = {
        "n_steps":  n,
        "T":        T,
        "time":     time,
        "ne":       ne.tolist(),
        "nH":       nH.tolist(),
        "lambda":   lam_func.tolist(),
        "contin":   None,  # populated below if .contin is available
    }
    result.update(line_arrays)

    # ------------------------------------------------------------------
    # Optional: process .contin file → write Float32 binary
    # ------------------------------------------------------------------
    if os.path.exists(contin_path):
        print(f"  Loading .contin ({os.path.getsize(contin_path) // 1_000_000} MB) …")
        if not HAS_PANDAS:
            print("  [WARN] pandas not installed; skipping .contin. Run: pip install pandas")
        else:
            df = pd.read_csv(
                contin_path,
                sep="\t",
                comment="#",
                header=None,
                usecols=[0, 4],   # col 0 = λ (Å); col 4 = net trans ν·f(ν) (erg/cm²/s)
                dtype=float,
                engine="c",
                low_memory=False,
            )
            total_rows = len(df)
            rows_per_step = total_rows // n
            print(f"  {total_rows} contin rows → {rows_per_step} pts/step")

            # Native wavelength grid (Å), same for all steps, decreasing (radio→X-ray)
            native_lam  = df.iloc[:rows_per_step, 0].values
            flux_matrix = df.iloc[:, 1].values.reshape(n, rows_per_step)

            # Flip to increasing wavelength order for the browser
            native_lam_inc  = native_lam[::-1].copy()
            flux_matrix_inc = flux_matrix[:, ::-1].copy()

            # Write flat Float32 binary: n_steps × n_lam, row-major
            bin_name = f"{stem}-contin.f32"
            bin_path = os.path.join(model_dir, bin_name)
            bin_url  = f"demo_data/{os.path.basename(model_dir)}/{bin_name}"
            flux_matrix_inc.astype(np.float32).tofile(bin_path)
            size_mb = os.path.getsize(bin_path) / 1_000_000
            print(f"  Binary: {bin_path} ({size_mb:.1f} MB)")

            result["contin"] = {
                "bin":    bin_url,
                "n_lam":  rows_per_step,
                "lam_ang": native_lam_inc.tolist(),
            }
            print("  .contin done")
    else:
        print(f"  No .contin found (will use bremsstrahlung fallback in browser)")

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    output = {
        "metadata": {
            "metallicities": METALLICITIES,
            "models_available": {},
            "line_labels": [lbl for _, _, lbl in LINELIST],
            "line_keys":   [key for key, _, _ in LINELIST],
            "line_wavelengths_ang": [lam for _, lam, _ in LINELIST],
        },
        "models": {},
    }

    for model_key, dir_name, stem in MODELS:
        model_dir = os.path.join(BASE_DIR, dir_name)
        if not os.path.isdir(model_dir):
            print(f"[SKIP] {model_key}: directory not found ({model_dir})")
            output["metadata"]["models_available"][model_key] = False
            continue

        # Check if the directory has data files
        required = os.path.join(model_dir, stem + ".lambda")
        if not os.path.exists(required):
            print(f"[SKIP] {model_key}: no data files yet")
            output["metadata"]["models_available"][model_key] = False
            continue

        for z in METALLICITIES:
            model_full_key = f"{model_key}-{z}"
            print(f"[{model_full_key}]")
            data = process_model(model_dir, stem, z)
            if data is not None:
                output["models"][model_full_key] = data
                output["metadata"]["models_available"][model_key] = True
                print(f"  OK → {model_full_key}")
            else:
                output["metadata"]["models_available"][model_key] = False

    # Fill in any missing model keys
    for model_key, _, _ in MODELS:
        if model_key not in output["metadata"]["models_available"]:
            output["metadata"]["models_available"][model_key] = False

    print(f"\nWriting {OUT_FILE} …")
    with open(OUT_FILE, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_kb = os.path.getsize(OUT_FILE) // 1024
    print(f"Done. {OUT_FILE} ({size_kb} KB)")


if __name__ == "__main__":
    main()
