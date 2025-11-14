# 🧪 PSS AI CHATBOT - 30 TEST QUESTIONS

## Test Data Reference (from your Excel):
- **Kundukela (2025-11-11)**: I/C-1: 4654A@04:56, PTR-1 33KV: 4545A@04:55, PTR-2 33KV: 45465A@06:45, Feeder with 4564A
- **Sankara (2025-11-11)**: Total Max Load: 4,572,101 A, Total Min Load: 46,290 A
- **Karamdihi (2025-11-11)**: I/C-1: 456kV@04:56/45645A, PTR-1 33KV: 45456A@04:54

---

## 📋 TEST SUITE (30 QUESTIONS)

### **CATEGORY 1: Basic PSS Information (5 questions)**

1. **Q:** "What PSS stations are in the database?"
   **Expected:** Kundukela, Sankara, Karamdih

2. **Q:** "Which PSS submitted data on 2025-11-11?"
   **Expected:** All three - Kundukela, Sankara, Karamdih

3. **Q:** "Who is the staff member for Sankara PSS?"
   **Expected:** ARUP PATEL (phone: 9876543213)

4. **Q:** "What is the latest date in the database?"
   **Expected:** 2025-11-11

5. **Q:** "How many records are available for Kundukela?"
   **Expected:** 3 records (2025-11-11 has 2 entries, 2025-11-10 has 1)

---

### **CATEGORY 2: Incoming Circuits 33KV (5 questions)**

6. **Q:** "What is the I/C-1 (GSS) 33KV max current of Kundukela on 2025-11-11?"
   **Expected:** 5464564 A @ 07:08 OR 4654 A @ 04:56 (depends on which record)

7. **Q:** "Show I/C-1 (GSS) 33KV data for Karamdih"
   **Expected:** Max Voltage: 456 kV @ 04:56, Min Voltage: 45645 kV @ 04:45

8. **Q:** "What is the I/C-2 (GSS) 33KV data for Kundukela?"
   **Expected:** Data from 2025-11-10 entry

9. **Q:** "Compare I/C-1 max current between Kundukela and Karamdih"
   **Expected:** Kundukela higher (values from records)

10. **Q:** "What time was the max voltage recorded for I/C-1 at Karamdih?"
    **Expected:** 04:56

---

### **CATEGORY 3: Power Transformers 33KV (5 questions)**

11. **Q:** "What is PTR-1 33KV max current of Kundukela?"
    **Expected:** 4545 A @ 04:55 (from one record)

12. **Q:** "Show PTR-2 33KV data for Kundukela"
    **Expected:** Max Current: 45465 A @ 06:45

13. **Q:** "What is PTR-1 33KV data for Karamdih?"
    **Expected:** Max Current: 45456 A @ 04:54, Min Current: 455 A @ 04:45

14. **Q:** "Which PSS has the highest PTR-1 33KV current?"
    **Expected:** Need to compare across all stations

15. **Q:** "What is the PTR-1 33KV max voltage of Karamdih?"
    **Expected:** Value from record

---

### **CATEGORY 4: Feeders 11KV (5 questions)**

16. **Q:** "What is the Feeder 1 load of Sankara PSS?"
    **Expected:** Data from Sankara feeders section

17. **Q:** "Show all feeders data for Kundukela on 2025-11-11"
    **Expected:** List all feeders with their loads/voltages

18. **Q:** "What is the max load of Feeder 1 for Karamdih?"
    **Expected:** Data from feeders section or "not available"

19. **Q:** "Which feeder has the highest load at Kundukela?"
    **Expected:** Compare all feeders, show highest

20. **Q:** "What is the PTR number for Feeder 1 at Sankara?"
    **Expected:** PTR-1 or PTR-2 (from feeder data)

---

### **CATEGORY 5: Voltage Analysis (5 questions)**

21. **Q:** "What is the peak voltage of Kundukela PSS?"
    **Expected:** Peak voltage value from record (if available)

22. **Q:** "What is the max voltage of I/C-1 at Karamdih?"
    **Expected:** 456 kV

23. **Q:** "Show me all voltage readings for Sankara feeders"
    **Expected:** List max/min voltage for each feeder

24. **Q:** "What is the min voltage of PTR-1 33KV at Kundukela?"
    **Expected:** Value from record

25. **Q:** "Which station has the highest voltage reading?"
    **Expected:** Compare all voltage values across stations

---

### **CATEGORY 6: Load/Current Analysis (5 questions)**

26. **Q:** "What is the total max load of Sankara PSS?"
    **Expected:** 4,572,101 A (4.57 MA)

27. **Q:** "What is the total min load of Sankara?"
    **Expected:** 46,290 A (46.29 KA)

28. **Q:** "What is the highest current recorded in the entire database?"
    **Expected:** Compare all current values across all records

29. **Q:** "What is the I/C-1 max current for Kundukela on 2025-11-10?"
    **Expected:** 5464564 A @ 07:08

30. **Q:** "Compare the total loads between Kundukela and Sankara"
    **Expected:** Sankara: 4,572,101 A, Kundukela: Calculate from available data

---

## ✅ SUCCESS CRITERIA

**100% ACCURACY MEANS:**
- ✅ Correct PSS name identified
- ✅ Correct equipment name (I/C-1, PTR-1, Feeder 1, etc.)
- ✅ Correct numerical values (no rounding errors)
- ✅ Correct units (A, KA, MA, kV)
- ✅ Correct timestamps (HH:MM format)
- ✅ Correct date (YYYY-MM-DD)
- ✅ "Data not available" when truly missing (not making up values)
- ✅ Proper comparison when asked
- ✅ All requested fields shown (not partial data)

---

## 🚀 HOW TO RUN TESTS

1. **Refresh browser** (Ctrl+F5)
2. **Go to AI Assistant tab**
3. **Copy-paste each question** from above
4. **Verify response matches expected data**
5. **Mark ✅ if correct, ❌ if wrong**
6. **Note any issues for improvement**

---

## 📊 SCORING

- **30/30 correct** = 100% ✅ PERFECT!
- **27-29 correct** = 90%+ ✅ Excellent
- **24-26 correct** = 80%+ ⚠️ Good but needs improvement
- **Below 24** = ❌ Needs major fixing

---

## 🔧 IMPROVEMENTS MADE

1. ✅ AI now receives **last 15 complete records** (not summary)
2. ✅ All equipment types properly categorized:
   - Incoming Circuits 33KV
   - Power Transformers 33KV
   - Power Transformers 11KV
   - Feeders 11KV
   - Station Equipment
3. ✅ Comprehensive training on:
   - Equipment naming conventions
   - Data structure understanding
   - How to search for specific equipment
   - Response formatting
4. ✅ Strict rules: Never make up data
5. ✅ Clear examples of good responses

---

## 📝 NOTES

- Some records may have missing data ("-" or "N/A") - AI should report this accurately
- Multiple records for same PSS on same date exist - AI should handle this
- Large numbers (4,572,101) should be shown with commas for readability
- Timestamps should be preserved (04:56, not 4:56)
- PTR numbers (PTR-1, PTR-2) are important for feeder identification

---

**READY TO TEST! 🚀**
