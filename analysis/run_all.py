#!/usr/bin/env python3
"""
End-to-end runner for the final project pipeline.
Order:
  1) predict_demand_with_pi.py
  2) build_scenarios_from_pi.py
  3) optimize_scenarios.py
  4) monte_carlo_optimize.py
  5) export_manager_brief.py   (rolls up KPIs for managers)
"""

import os, sys, subprocess

BASE = os.path.dirname(os.path.abspath(__file__))

def py(cmd):
    print(f"\n>>> {cmd}")
    code = subprocess.call([sys.executable, "-u", cmd], cwd=BASE)
    if code != 0:
        print(f"ERROR: {cmd} failed with exit code {code}")
        sys.exit(code)

def main():
    py("predict_demand_with_pi.py")
    py("build_scenarios_from_pi.py")
    py("optimize_scenarios.py")
    py("monte_carlo_optimize.py")
    py("export_manager_brief.py")
    print("\n✅ All steps completed. See /data and /analysis folders for outputs.")

if __name__ == "__main__":
    main()
