        let myChart = null;
        
        document.getElementById('generateBtn').addEventListener('click', function() {
            const paragraph = document.getElementById('textData').value;
            const chartType = document.getElementById('chartType').value;
            
            if (!paragraph.trim()) {
                showAnalysis("Please enter a paragraph containing data to analyze.");
                return;
            }
            
            const { extractedData, analysis, dataType } = extractDataFromParagraph(paragraph);
            
            if (extractedData.length === 0) {
                showAnalysis("No numerical data found in the paragraph. Try including numbers and their context.");
                return;
            }
            
            showAnalysis(analysis);
            createTable(extractedData);
            createChart(extractedData, chartType, dataType);
        });

        function extractDataFromParagraph(text) {
            const data = [];
            let analysis = "";
            let dataType = "categorical";
            
            // 1. Try to extract percentage data (30% apples)
            const percentMatches = text.matchAll(/(\d+\.?\d*)%\s+(?:for|of|prefer|chose|selected|like|were|are|favor|choose|go\s+for|pick|select|vote\s+for|rate|rank)?\s*([a-zA-Z\s]+)/gi);
            for (const match of percentMatches) {
                data.push({
                    label: match[2].trim(),
                    value: parseFloat(match[1]),
                    type: 'percentage'
                });
            }
            
            // 2. Try to extract labeled values (January: 100)
            const labeledMatches = text.matchAll(/([a-zA-Z]+)\s*[:=]\s*(\d+\.?\d*)/g);
            for (const match of labeledMatches) {
                data.push({
                    label: match[1].trim(),
                    value: parseFloat(match[2]),
                    type: 'value'
                });
            }
            
            // 3. Try to extract numeric pairs (Q1: 4.2, Q2: 4.5)
            const pairMatches = text.matchAll(/([a-zA-Z0-9]+\s*[a-zA-Z0-9]*)\s*[:=]\s*(\d+\.?\d*)/g);
            for (const match of pairMatches) {
                if (!data.some(item => item.label === match[1].trim())) {
                    data.push({
                        label: match[1].trim(),
                        value: parseFloat(match[2]),
                        type: 'value'
                    });
                }
            }
            
            // 4. Try to extract standalone numbers with context
            if (data.length === 0) {
                const numberMatches = text.matchAll(/(\d+\.?\d*)\s+([a-zA-Z]+)/g);
                for (const match of numberMatches) {
                    data.push({
                        label: match[2].trim(),
                        value: parseFloat(match[1]),
                        type: 'value'
                    });
                }
            }
            
            // 5. Try to extract ranges (scores ranged from 65 to 95)
            const rangeMatch = text.match(/(?:range|between)\s+(\d+)\s+(?:and|to)\s+(\d+)/i);
            if (rangeMatch && data.length === 0) {
                const min = parseFloat(rangeMatch[1]);
                const max = parseFloat(rangeMatch[2]);
                const range = max - min;
                const binSize = Math.ceil(range / 5);
                
                for (let i = 0; i < 5; i++) {
                    const binStart = min + (i * binSize);
                    const binEnd = binStart + binSize;
                    data.push({
                        label: `${binStart}-${binEnd}`,
                        value: Math.random() * 20 + 10, // Random frequency for demo
                        type: 'range'
                    });
                }
                dataType = "numerical";
            }
            
            // 6. Try to extract distribution info (most between 75-85)
            const distMatch = text.match(/most\s+(?:between|in)\s+(\d+)\s*-\s*(\d+)/i);
            if (distMatch && data.length === 0) {
                const binStart = parseFloat(distMatch[1]);
                const binEnd = parseFloat(distMatch[2]);
                data.push({
                    label: `${binStart}-${binEnd}`,
                    value: 70, // High value for "most"
                    type: 'range'
                });
                
                // Add some surrounding bins
                const binSize = binEnd - binStart;
                data.push({
                    label: `${binStart-binSize}-${binStart}`,
                    value: 20,
                    type: 'range'
                });
                data.push({
                    label: `${binEnd}-${binEnd+binSize}`,
                    value: 10,
                    type: 'range'
                });
                dataType = "numerical";
            }
            
            // 7. Fallback to just numbers
            if (data.length === 0) {
                const numbers = text.match(/\d+\.?\d*/g);
                if (numbers) {
                    numbers.forEach((num, index) => {
                        data.push({
                            label: `Item ${index + 1}`,
                            value: parseFloat(num),
                            type: 'value'
                        });
                    });
                    // If we have many numbers, it's probably numerical data
                    if (numbers.length > 5) dataType = "numerical";
                }
            }
            
            // Generate analysis text
            if (data.length > 0) {
                analysis = `Found ${data.length} data points. `;
                
                const hasPercentages = data.some(item => item.type === 'percentage');
                const hasTimeLabels = data.some(item => 
                    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q1|q2|q3|q4|week|day|month|year)/i.test(item.label)
                );
                
                if (hasPercentages) {
                    analysis += "Detected percentage data. ";
                }
                if (hasTimeLabels) {
                    analysis += "Detected time-based labels. ";
                }
                if (dataType === "numerical") {
                    analysis += "Detected numerical distribution data. ";
                }
                
                const recommendedChart = recommendChartType(data, dataType);
                analysis += `Recommended chart type: <span class="recommended">${recommendedChart}</span> based on data characteristics.`;
            }
            
            return { extractedData: data, analysis, dataType };
        }

        function recommendChartType(data, dataType) {
            const hasPercentages = data.some(item => item.type === 'percentage');
            const hasTimeLabels = data.some(item => 
                /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q1|q2|q3|q4|week|day|month|year)/i.test(item.label)
            );
            const uniqueValues = [...new Set(data.map(item => item.value))];
            
            if (dataType === "numerical" && data.length > 10) {
                return 'histogram';
            } else if (dataType === "numerical" && data.length > 5) {
                return 'scatter';
            } else if (hasPercentages && data.length <= 6) {
                return 'pie';
            } else if (hasPercentages) {
                return 'bar';
            } else if (hasTimeLabels && data.length >= 3) {
                return 'line';
            } else if (data.length <= 5) {
                return 'pie';
            } else if (uniqueValues.length <= 3) {
                return 'doughnut';
            } else {
                return 'bar';
            }
        }

        function showAnalysis(text) {
            document.getElementById('analysis').innerHTML = text;
        }

        function createTable(data) {
            let tableHTML = '<table><tr><th>Label</th><th>Value</th></tr>';
            
            data.forEach(item => {
                tableHTML += `<tr><td>${item.label}</td><td>${item.value}${item.type === 'percentage' ? '%' : ''}</td></tr>`;
            });
            
            tableHTML += '</table>';
            document.getElementById('tableContainer').innerHTML = tableHTML;
        }

        function createChart(data, chartType, dataType) {
            const ctx = document.getElementById('dataChart').getContext('2d');
            
            // Destroy previous chart if exists
            if (myChart) {
                myChart.destroy();
            }
            
            // Determine chart type
            const finalChartType = chartType === 'auto' ? recommendChartType(data, dataType) : chartType;
            const labels = data.map(item => item.label);
            const values = data.map(item => item.value);
            
            // Update the select to show what was actually used
            if (chartType === 'auto') {
                document.getElementById('chartType').querySelector('option[value="auto"]').textContent = 
                    `Auto-select (${finalChartType})`;
            }
            
            // Generate colors
            const backgroundColors = generateColors(data.length);
            
            // Special configuration for scatter plot
            if (finalChartType === 'scatter') {
                myChart = new Chart(ctx, {
                    type: 'scatter',
                    data: {
                        datasets: [{
                            label: 'Data Points',
                            data: values.map((value, index) => ({
                                x: index,
                                y: value
                            })),
                            backgroundColor: backgroundColors,
                            borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                            borderWidth: 1,
                            pointRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Scatter Plot',
                                font: {
                                    size: 16
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `Value: ${context.parsed.y}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Index'
                                }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: 'Value'
                                },
                                beginAtZero: false
                            }
                        }
                    }
                });
                return;
            }
            
            // Special configuration for histogram
            if (finalChartType === 'histogram') {
                // Sort the values for histogram
                const sortedValues = [...values].sort((a, b) => a - b);
                const minValue = Math.min(...sortedValues);
                const maxValue = Math.max(...sortedValues);
                const range = maxValue - minValue;
                const binCount = Math.min(10, Math.ceil(Math.sqrt(sortedValues.length)));
                const binSize = range / binCount;
                
                // Create bins
                const bins = Array(binCount).fill(0);
                const binLabels = [];
                
                for (let i = 0; i < binCount; i++) {
                    const binStart = minValue + (i * binSize);
                    const binEnd = binStart + binSize;
                    binLabels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
                    
                    // Count values in this bin
                    bins[i] = sortedValues.filter(v => v >= binStart && v < binEnd).length;
                }
                
                // Include the max value in the last bin
                bins[binCount-1] += sortedValues.filter(v => v === maxValue).length;
                
                myChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: binLabels,
                        datasets: [{
                            label: 'Frequency',
                            data: bins,
                            backgroundColor: backgroundColors,
                            borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Histogram',
                                font: {
                                    size: 16
                                }
                            },
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Frequency'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Value Range'
                                }
                            }
                        }
                    }
                });
                return;
            }
            
            // Standard chart configuration for other types
            myChart = new Chart(ctx, {
                type: finalChartType,
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Values',
                        data: values,
                        backgroundColor: backgroundColors,
                        borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: data.length > 10 ? 'bottom' : 'right',
                        },
                        title: {
                            display: true,
                            text: 'Data Visualization',
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += context.parsed.y || context.parsed;
                                    if (data[context.dataIndex]?.type === 'percentage') {
                                        label += '%';
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: (finalChartType === 'bar' || finalChartType === 'line') ? {
                        y: {
                            beginAtZero: true
                        }
                    } : {}
                }
            });
        }

        function generateColors(count) {
            const colors = [];
            for (let i = 0; i < count; i++) {
                const hue = (i * 360 / count) % 360;
                colors.push(`hsla(${hue}, 70%, 50%, 0.7)`);
            }
            return colors;
        }
