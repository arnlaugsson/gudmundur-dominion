"""Helpers for scripts/sync_spreadsheet.py, split by concern.

- cells:       low-level cell readers
- layout:      locating sheet sections by their column-A labels
- normalize:   name / expansion / location / victory-type / card-name fixes
- teams:       players + scores blocks -> results and seats (team play)
- games:       parsing one game column group, and the whole "Öll spil" sheet
- card_sheets: parsing the per-expansion card sheets
- card_list:   reconciling the JSON card list against those sheets
- output:      building and writing dominion_data.json
"""
