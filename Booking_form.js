(function calculateGSTForSchedule() {
    function parseAndCalculate() {
        var tables = document.querySelectorAll('.payment-schedule-table');
        
        tables.forEach(function(table) {
            var rows = table.querySelectorAll('tbody tr');
            rows.forEach(function(row) {
                var amountCell = row.querySelector('.amount-cell, .total-amount-cell');
                var gstCell = row.querySelector('.gst-cell, .total-gst-cell');

                if (amountCell && gstCell) {
                    var text = amountCell.textContent || amountCell.innerText;
                    // Extract numerical values
                    var numericValue = parseFloat(text.replace(/[^0-9.-]+/g, ""));

                    if (!isNaN(numericValue) && numericValue > 0) {
                        var gstValue = numericValue * 0.18;
                        gstCell.textContent = 'Rs.' + gstValue.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        });
                    }
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', parseAndCalculate);
    } else {
        parseAndCalculate();
    }
})();