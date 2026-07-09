        // DOM elements
        const fileInput = document.getElementById('csvFile');
        const fileInfo = document.getElementById('fileInfo');
        const controls = document.getElementById('controls');
        const categoryColumnSelect = document.getElementById('categoryColumn');
        const valueColumnSelect = document.getElementById('valueColumn');
        const chartTypeSelect = document.getElementById('chartType');
        const generateBtn = document.getElementById('generateBtn');
        const tableContainer = document.getElementById('tableContainer');
        const ctx = document.getElementById('dataChart').getContext('2d');
        const backButton = document.getElementById('backButton');
        const chartActions = document.getElementById('chartActions');
        const downloadBtn = document.getElementById('downloadBtn');
        const toast = document.getElementById('toast');
        const aiRecommendation = document.getElementById('aiRecommendation');
        const recommendationText = document.getElementById('recommendationText');
        const useRecommendationBtn = document.getElementById('useRecommendationBtn');
        const dataSummary = document.getElementById('dataSummary');
        const summaryContent = document.getElementById('summaryContent');
       
        // Global variables
        let csvData = [];
        let columnTypes = {};
        let currentChart = null;

        // Event listeners
        fileInput.addEventListener('change', handleFileSelect);
        generateBtn.addEventListener('click', generateChart);
        backButton.addEventListener('click', () => {
            window.location.href = 'welcome.html';
        });
        downloadBtn.addEventListener('click', downloadChart);
        useRecommendationBtn.addEventListener('click', useRecommendedChart);
       
        // Drag and drop functionality
        const uploadBox = document.querySelector('.upload-box');
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = '#4CAF50';
            uploadBox.style.backgroundColor = '#f8f8f8';
        });
       
        uploadBox.addEventListener('dragleave', () => {
            uploadBox.style.borderColor = '#ccc';
            uploadBox.style.backgroundColor = '';
        });
       
        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = '#ccc';
            uploadBox.style.backgroundColor = '';
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect({ target: fileInput });
            } else {
                alert('Please upload a valid CSV file');
            }
        });

        // Handle file selection
        function handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;
           
            fileInfo.textContent = `Loading: ${file.name}...`;
            fileInfo.classList.add('loading');
           
            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                complete: function(results) {
                    fileInfo.classList.remove('loading');
                    if (results.data.length === 0 || !results.meta.fields) {
                        fileInfo.textContent = 'Error: No valid data found in CSV';
                        return;
                    }
                   
                    csvData = results.data;
                    analyzeColumns(results.meta.fields);
                   
                    fileInfo.textContent = `Loaded: ${file.name} (${csvData.length} rows, ${results.meta.fields.length} columns)`;
                    setupColumnSelects();
                    createDataPreview();
                    controls.style.display = 'block';
                    generateChart();
                },
                error: function(error) {
                    fileInfo.classList.remove('loading');
                    fileInfo.textContent = 'Error parsing CSV file';
                    console.error('CSV Error:', error);
                }
            });
        }

        // Analyze columns to determine their types
        function analyzeColumns(columns) {
            columnTypes = {};
           
            // Check first 10 rows to determine column types
            const sampleSize = Math.min(10, csvData.length);
           
            columns.forEach(col => {
                let hasNumbers = false;
                let hasText = false;
               
                for (let i = 0; i < sampleSize; i++) {
                    const value = csvData[i][col];
                    if (value === null || value === undefined || value === '') continue;
                   
                    if (typeof value === 'number') {
                        hasNumbers = true;
                    } else if (typeof value === 'string') {
                        hasText = true;
                    }
                }
               
                if (hasNumbers && !hasText) {
                    columnTypes[col] = 'number';
                } else if (hasText && !hasNumbers) {
                    columnTypes[col] = 'text';
                } else {
                    columnTypes[col] = 'mixed';
                }
            });
        }

        // Set up the column dropdowns with type information
        function setupColumnSelects() {
            // Clear previous options
            categoryColumnSelect.innerHTML = '';
            valueColumnSelect.innerHTML = '';
           
            // Add options for each column with type indicators
            Object.keys(columnTypes).forEach(col => {
                const type = columnTypes[col];
                const typeLabel = type === 'number' ? ' (number)' :
                                 type === 'text' ? ' (text)' : ' (mixed)';
               
                // Add to category dropdown (prefer text columns)
                const categoryOption = new Option(col + typeLabel, col);
                categoryColumnSelect.add(categoryOption);
               
                // Add to value dropdown (prefer number columns)
                const valueOption = new Option(col + typeLabel, col);
                valueColumnSelect.add(valueOption);
            });
           
            // Set default selections (first text column for category, first number column for value)
            const columns = Object.keys(columnTypes);
            const defaultCategory = columns.find(col => columnTypes[col] === 'text') || columns[0];
            const defaultValue = columns.find(col => columnTypes[col] === 'number') || (columns[1] || columns[0]);
           
            categoryColumnSelect.value = defaultCategory;
            valueColumnSelect.value = defaultValue;
           
            // Generate AI recommendation
            generateAIRecommendation(defaultCategory, defaultValue);
        }

        // Generate AI recommendation for chart type
        function generateAIRecommendation(categoryCol, valueCol) {
            // Simple AI logic to recommend chart type based on data characteristics
            const categoryType = columnTypes[categoryCol];
            const valueType = columnTypes[valueCol];
            const uniqueCategories = new Set(csvData.map(row => row[categoryCol])).size;
            const valueRange = getValueRange(valueCol);
           
            let recommendedChart = 'pie';
            let recommendationReason = '';
           
            if (categoryType === 'text' && valueType === 'number') {
                if (uniqueCategories <= 7) {
                    recommendedChart = 'pie';
                    recommendationReason = `Pie charts work well when showing parts of a whole with a small number (${uniqueCategories}) of categories.`;
                } else if (uniqueCategories <= 15) {
                    recommendedChart = 'bar';
                    recommendationReason = `With ${uniqueCategories} categories, a bar chart will better display the comparisons between values.`;
                } else {
                    recommendedChart = 'line';
                    recommendationReason = `With many categories (${uniqueCategories}), a line chart can better show trends without clutter.`;
                }
               
                if (valueRange.max / valueRange.min > 100) {
                    recommendedChart = 'bar';
                    recommendationReason += " The wide range of values makes a bar chart more suitable.";
                }
            } else if (categoryType === 'number' && valueType === 'number') {
                recommendedChart = 'scatter';
                recommendationReason = "Since both axes are numerical, a scatter plot can best show the relationship between these variables.";
            } else {
                recommendedChart = 'bar';
                recommendationReason = "This combination of data types is best visualized with a bar chart.";
            }
           
            recommendationText.innerHTML = `Based on your data, we recommend using a <strong>${recommendedChart.charAt(0).toUpperCase() + recommendedChart.slice(1)} Chart</strong>. ${recommendationReason}`;
            aiRecommendation.dataset.recommendedChart = recommendedChart;
            aiRecommendation.style.display = 'block';
        }
       
        // Get the range of values in a column
        function getValueRange(column) {
            const values = csvData.map(row => row[column]).filter(val => typeof val === 'number');
            if (values.length === 0) return { min: 0, max: 0 };
           
            return {
                min: Math.min(...values),
                max: Math.max(...values)
            };
        }
       
        // Use the AI recommended chart type
        function useRecommendedChart() {
            const recommendedChart = aiRecommendation.dataset.recommendedChart;
            chartTypeSelect.value = recommendedChart;
            generateChart();
            showToast(`Using recommended ${recommendedChart} chart`);
        }

        // Generate the chart based on selected options
        function generateChart() {
            const categoryCol = categoryColumnSelect.value;
            const valueCol = valueColumnSelect.value;
            const chartType = chartTypeSelect.value;
           
            // Prepare data
            const labels = csvData.map(row => row[categoryCol]);
            const data = csvData.map(row => row[valueCol]);
           
            // Destroy previous chart if exists
            if (currentChart) {
                currentChart.destroy();
            }
           
            // Create new chart
            const baseConfig = {
                type: chartType,
                data: {
                    labels: labels,
                    datasets: [{
                        label: valueCol,
                        data: data,
                        backgroundColor: getBackgroundColors(chartType, data.length),
                        borderColor: (chartType === 'line' || chartType === 'scatter') ? 'rgba(75, 192, 192, 1)' : undefined,
                        borderWidth: (chartType === 'line' || chartType === 'scatter') ? 2 : undefined
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `${valueCol} by ${categoryCol}`
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${valueCol}: ${context.parsed.y || context.raw}`;
                                },
                                afterLabel: function(context) {
                                    return `${categoryCol}: ${context.label}`;
                                }
                            }
                        }
                    },
                    scales: (chartType !== 'pie' && chartType !== 'doughnut' && chartType !== 'radar') ? {
                        x: {
                            title: {
                                display: true,
                                text: categoryCol
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: valueCol
                            },
                            beginAtZero: chartType === 'bar' || chartType === 'line'
                        }
                    } : undefined
                }
            };

            // Special configurations for specific chart types
            if (chartType === 'bubble') {
                // For bubble chart, we need to add radius data
                const maxValue = Math.max(...data);
                baseConfig.data.datasets[0].data = data.map((value, index) => ({
                    x: index,
                    y: value,
                    r: (value / maxValue) * 30 + 10
                }));
                baseConfig.type = 'bubble';
                baseConfig.options.scales = {
                    x: {
                        title: {
                            display: true,
                            text: 'Index'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: valueCol
                        },
                        beginAtZero: true
                    }
                };
            } else if (chartType === 'radar') {
                baseConfig.options.scales = {
                    r: {
                        beginAtZero: true
                    }
                };
            } else if (chartType === 'histogram') {
                baseConfig.type = 'bar';
                baseConfig.options.scales.x.type = 'linear';
                baseConfig.options.scales.x.offset = true;
                baseConfig.options.scales.x.ticks = {
                    stepSize: 1
                };
            }
           
            currentChart = new Chart(ctx, baseConfig);
           
            // Show chart actions
            chartActions.style.display = 'flex';
           
            // Generate data summary
            generateDataSummary(categoryCol, valueCol, chartType);
        }

        // Generate appropriate background colors based on chart type
        function getBackgroundColors(chartType, count) {
            if (chartType === 'pie' || chartType === 'doughnut' || chartType === 'radar') {
                const colors = [];
                for (let i = 0; i < count; i++) {
                    const hue = (i * 360 / count) % 360;
                    colors.push(`hsl(${hue}, 70%, 50%)`);
                }
                return colors;
            } else if (chartType === 'bar' || chartType === 'histogram') {
                // Different color for each bar
                const colors = [];
                for (let i = 0; i < count; i++) {
                    const hue = (i * 360 / count) % 360;
                    colors.push(`hsla(${hue}, 70%, 50%, 0.7)`);
                }
                return colors;
            } else {
                return 'rgba(75, 192, 192, 0.5)';
            }
        }

        // Create data preview table
        function createDataPreview() {
            const columns = Object.keys(columnTypes);
            let tableHTML = '<table><thead><tr>';
           
            // Create header row with type indicators
            columns.forEach(col => {
                const type = columnTypes[col];
                const typeLabel = type === 'number' ? ' (number)' :
                                 type === 'text' ? ' (text)' : ' (mixed)';
                tableHTML += `<th>${col}<span class="column-type">${typeLabel}</span></th>`;
            });
            tableHTML += '</tr></thead><tbody>';
           
            // Create data rows (limit to 50 for performance)
            const rowCount = Math.min(50, csvData.length);
            for (let i = 0; i < rowCount; i++) {
                tableHTML += '<tr>';
                columns.forEach(col => {
                    tableHTML += `<td>${csvData[i][col] !== undefined ? csvData[i][col] : ''}</td>`;
                });
                tableHTML += '</tr>';
            }
           
            tableHTML += '</tbody></table>';
           
            if (csvData.length > 50) {
                tableHTML += `<p>Showing first 50 rows of ${csvData.length}</p>`;
            }
           
            tableContainer.innerHTML = tableHTML;
        }
       
        // Generate data summary
        function generateDataSummary(categoryCol, valueCol, chartType) {
            const categoryType = columnTypes[categoryCol];
            const valueType = columnTypes[valueCol];
            const uniqueCategories = new Set(csvData.map(row => row[categoryCol])).size;
            const valueRange = getValueRange(valueCol);
            const valueData = csvData.map(row => row[valueCol]).filter(val => typeof val === 'number');
            const sum = valueData.reduce((a, b) => a + b, 0);
            const avg = sum / valueData.length;
           
            let summaryHTML = `
                <div class="summary-item">
                    <h4>Chart Summary</h4>
                    <p>This ${chartType} chart shows the relationship between <strong>${categoryCol}</strong> (${categoryType}) and <strong>${valueCol}</strong> (${valueType}).</p>
                </div>
               
                <div class="summary-item">
                    <h4>Data Statistics</h4>
                    <div class="summary-stats">
                        <div class="stat-card">
                            <h5>Unique Categories</h5>
                            <p>${uniqueCategories}</p>
                        </div>
            `;
           
            if (valueType === 'number') {
                summaryHTML += `
                        <div class="stat-card">
                            <h5>Average Value</h5>
                            <p>${avg.toFixed(2)}</p>
                        </div>
                        <div class="stat-card">
                            <h5>Minimum Value</h5>
                            <p>${valueRange.min}</p>
                        </div>
                        <div class="stat-card">
                            <h5>Maximum Value</h5>
                            <p>${valueRange.max}</p>
                        </div>
                        <div class="stat-card">
                            <h5>Total</h5>
                            <p>${sum.toFixed(2)}</p>
                        </div>
                `;
            }
           
            summaryHTML += `
                    </div>
                </div>
               
                <div class="summary-item">
                    <h4>Chart Interpretation</h4>
                    <p>${getChartInterpretation(chartType, categoryCol, valueCol)}</p>
                </div>
            `;
           
            summaryContent.innerHTML = summaryHTML;
            dataSummary.style.display = 'block';
        }
       
        // Get interpretation text for the chart
        function getChartInterpretation(chartType, categoryCol, valueCol) {
            switch(chartType) {
                case 'pie':
                case 'doughnut':
                    return `This ${chartType} chart shows how each category in <strong>${categoryCol}</strong> contributes to the total of <strong>${valueCol}</strong>. The size of each slice represents its proportion of the whole.`;
                case 'bar':
                    return `This bar chart compares the values of <strong>${valueCol}</strong> across different categories in <strong>${categoryCol}</strong>. The height of each bar represents its value, making comparisons easy.`;
                case 'line':
                    return `This line chart shows trends or patterns in <strong>${valueCol}</strong> across the categories in <strong>${categoryCol}</strong>. The line connects data points to show progression.`;
                case 'scatter':
                    return `This scatter plot displays the relationship between <strong>${categoryCol}</strong> and <strong>${valueCol}</strong>. Each point represents an observation, showing how the two variables correlate.`;
                case 'bubble':
                    return `This bubble chart visualizes the values of <strong>${valueCol}</strong>, where the size of each bubble represents its magnitude.`;
                case 'radar':
                    return `This radar chart displays the values of <strong>${valueCol}</strong> across different categories in <strong>${categoryCol}</strong>, showing patterns in a circular format.`;
                case 'histogram':
                    return `This histogram shows the distribution of values for <strong>${valueCol}</strong>, grouping values into bins to visualize frequency.`;
                default:
                    return `This chart visualizes the relationship between <strong>${categoryCol}</strong> and <strong>${valueCol}</strong>.`;
            }
        }
       
        // Download chart as PNG image
        function downloadChart() {
            if (!currentChart) return;
           
            const link = document.createElement('a');
            link.download = 'chart.png';
            link.href = document.getElementById('dataChart').toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
           
            showToast('Chart downloaded successfully!');
        }
       
        // Show toast notification
        function showToast(message, isError = false) {
            toast.textContent = message;
            toast.style.backgroundColor = isError ? 'var(--error-color)' : '#333';
            toast.classList.add('show');
           
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
