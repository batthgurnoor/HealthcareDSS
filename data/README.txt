data/patient_arrivals_history.csv
- Historical arrivals per hour.
- Columns:
  date (YYYY-MM-DD)
  hour (0-23 integer)
  arrivals (number of patients that hour)
  is_weekend (0 if weekday, 1 if Sat/Sun)

The predictive script will train on this.

data/predicted_demand.csv
- Created by analysis/predict_demand.py.
- Forecasted demand per shift for the next day.
- Columns:
  date (YYYY-MM-DD)
  shift (morning / evening / night)
  scenario (pessimistic / baseline / optimistic)
  predicted_patients (float)

This file will be used by the staffing optimization step in Assignment 2.
