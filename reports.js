/**
 * 报告管理模块
 * 负责AI分析报告的显示和管理
 */
class ReportManager {
    constructor() {
        this.reportContent = document.getElementById('report-content');
        this.currentReports = [];
        this.initReportControls();
    }

    /**
     * 初始化报告控制
     */
    initReportControls() {
        const exportBtn = document.getElementById('export-report-btn');
        const clearBtn = document.getElementById('clear-report-btn');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportReports());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearReports());
        }
    }

    /**
     * 显示AI分析结果
     */
    displayAnalysis(analysisData) {
        try {
            console.log('显示AI分析结果:', analysisData);

            const plantId = analysisData.plant_id || '未知';
            const analysis = analysisData.analysis || {};
            const timestamp = analysisData.timestamp || new Date().toISOString();

            // 添加到报告列表
            this.currentReports.push(analysisData);
            ui.incrementAnalyzedCount();

            // 生成HTML报告
            const reportHTML = this.generateReportHTML(analysisData);

            // 更新报告内容
            this.reportContent.innerHTML = reportHTML;

            // 添加动画效果
            this.reportContent.classList.add('slide-in');
            setTimeout(() => {
                this.reportContent.classList.remove('slide-in');
            }, 300);

            ui.addLog('success', `植株 ${plantId} 的AI分析报告已生成`);

        } catch (error) {
            console.error('显示分析结果失败:', error);
            this.displayError('分析结果显示失败', error.message);
        }
    }

    /**
     * 生成报告HTML
     */
    generateReportHTML(analysisData) {
        const plantId = analysisData.plant_id || '未知';
        const analysis = analysisData.analysis || {};
        const timestamp = analysisData.timestamp || new Date().toISOString();

        // 获取分析结果数据
        const healthScore = analysis.health_score || 0;
        const analysisSummary = analysis.analysis_summary || '分析完成';
        const urgency = analysis.urgency || 'medium';
        const analysisId = analysis.analysis_id || 'N/A';
        const analysisTime = analysis.analysis_time || timestamp;

        // 专业农业分析数据
        const cropType = analysis.crop_type || {};
        const growthStage = analysis.growth_stage || {};
        const diseases = analysis.diseases || [];
        const nutritionStatus = analysis.nutrition_status || {};
        const issues = analysis.issues || [];
        const recommendations = analysis.recommendations || [];
        const imageFeatures = analysis.image_features || {};

        // 健康评分样式
        const scoreStyle = this.getHealthScoreStyle(healthScore);
        const urgencyStyle = this.getUrgencyStyle(urgency);

        return `
<div class="ai-report">
    <!-- 报告头部 -->
    <div class="report-header-section">
        <div class="report-title">
            <i class="fas fa-robot"></i>
            <h2>专业农作物AI分析报告</h2>
            <span class="report-badge">阿里云百炼AI</span>
        </div>
        <div class="report-meta">
            <span class="analysis-id">分析ID: ${analysisId}</span>
            <span class="timestamp">${new Date(analysisTime).toLocaleString()}</span>
        </div>
    </div>

    <!-- 基本信息 -->
    <div class="info-section">
        <h3><i class="fas fa-info-circle"></i> 基本信息</h3>
        <div class="info-grid">
            <div class="info-item">
                <span class="label">植株ID:</span>
                <span class="value">${plantId}</span>
            </div>
            <div class="info-item">
                <span class="label">分析时间:</span>
                <span class="value">${new Date(timestamp).toLocaleString()}</span>
            </div>
            <div class="info-item">
                <span class="label">分析类型:</span>
                <span class="value">专业农业AI</span>
            </div>
            <div class="info-item">
                <span class="label">AI服务:</span>
                <span class="value">阿里云百炼</span>
            </div>
        </div>
    </div>

    ${this.generateCropTypeSection(cropType)}
    ${this.generateGrowthStageSection(growthStage)}

    <!-- 健康评分 -->
    <div class="health-score-section">
        <h3><i class="fas fa-heartbeat"></i> 健康评估</h3>
        <div class="score-display" style="${scoreStyle.background}">
            <div class="score-value">${healthScore}</div>
            <div class="score-label">健康评分</div>
            <div class="score-status" style="color: ${scoreStyle.color}">${scoreStyle.status}</div>
        </div>
        <div class="urgency-badge" style="${urgencyStyle.style}">
            <i class="${urgencyStyle.icon}"></i>
            <span>紧急程度: ${urgency.toUpperCase()}</span>
        </div>
    </div>

    ${this.generateDiseasesSection(diseases)}
    ${this.generateNutritionSection(nutritionStatus)}
    ${this.generateImageFeaturesSection(imageFeatures)}

    <!-- 详细分析 -->
    <div class="analysis-section">
        <h3><i class="fas fa-search"></i> 详细分析摘要</h3>
        <div class="analysis-content">
            <div class="analysis-text">${analysisSummary}</div>
        </div>
    </div>

    ${this.generateIssuesSection(issues)}
    ${this.generateRecommendationsSection(recommendations)}

    <!-- 技术说明 -->
    <div class="tech-info">
        <h4><i class="fas fa-cog"></i> 技术说明</h4>
        <ul>
            <li>本报告由阿里云百炼AI + 专业农业知识库生成</li>
            <li>包含作物识别、病害诊断、营养分析等专业功能</li>
            <li>基于深度学习、计算机视觉和农业专家知识</li>
            <li>建议结合实地观察和农业专家意见使用</li>
        </ul>
    </div>
</div>
        `;
    }

    /**
     * 生成作物类型部分
     */
    generateCropTypeSection(cropType) {
        if (!cropType || !cropType.name) return '';

        return `
    <div class="crop-section">
        <h3><i class="fas fa-seedling"></i> 作物识别</h3>
        <div class="crop-info">
            <div class="crop-item">
                <span class="label">识别结果:</span>
                <span class="value">${cropType.name}</span>
            </div>
            <div class="crop-item">
                <span class="label">置信度:</span>
                <span class="value">${cropType.confidence || 0}%</span>
            </div>
            <div class="crop-item">
                <span class="label">特征描述:</span>
                <span class="value">${cropType.characteristics || '暂无'}</span>
            </div>
        </div>
    </div>
        `;
    }

    /**
     * 生成生长阶段部分
     */
    generateGrowthStageSection(growthStage) {
        if (!growthStage || !growthStage.stage) return '';

        return `
    <div class="growth-section">
        <h3><i class="fas fa-chart-line"></i> 生长状态</h3>
        <div class="growth-info">
            <div class="growth-item">
                <span class="label">当前阶段:</span>
                <span class="value">${growthStage.stage}</span>
            </div>
            <div class="growth-item">
                <span class="label">状态描述:</span>
                <span class="value">${growthStage.description || '暂无'}</span>
            </div>
            <div class="growth-item">
                <span class="label">管理要点:</span>
                <span class="value">${growthStage.care_points || '暂无'}</span>
            </div>
        </div>
    </div>
        `;
    }

    /**
     * 生成病害诊断部分
     */
    generateDiseasesSection(diseases) {
        if (!diseases || diseases.length === 0) return '';

        let html = `
    <div class="diseases-section">
        <h3><i class="fas fa-bug"></i> 病害诊断</h3>
        <div class="diseases-list">
        `;

        diseases.forEach((disease, index) => {
            const severityClass = this.getSeverityClass(disease.severity);
            html += `
            <div class="disease-item ${severityClass}">
                <div class="disease-header">
                    <h4>${index + 1}. ${disease.name || '未知病害'}</h4>
                    <span class="severity-badge ${severityClass}">
                        ${(disease.severity || 'medium').toUpperCase()}
                    </span>
                </div>
                <div class="disease-details">
                    <p><strong>症状:</strong> ${disease.symptoms || '暂无'}</p>
                    <p><strong>病原:</strong> ${disease.pathogen || '未确定'}</p>
                    <p><strong>发生概率:</strong> ${disease.probability || 0}%</p>
                    <p><strong>治疗方案:</strong> ${disease.treatment || '请咨询专家'}</p>
                    <p><strong>预防措施:</strong> ${disease.prevention || '加强田间管理'}</p>
                </div>
            </div>
            `;
        });

        html += `
        </div>
    </div>
        `;

        return html;
    }

    /**
     * 生成营养状态部分
     */
    generateNutritionSection(nutritionStatus) {
        if (!nutritionStatus || !nutritionStatus.summary) return '';

        let html = `
    <div class="nutrition-section">
        <h3><i class="fas fa-flask"></i> 营养状态分析</h3>
        <div class="nutrition-summary">
            <p>${nutritionStatus.summary}</p>
        </div>
        `;

        if (nutritionStatus.deficiencies && nutritionStatus.deficiencies.length > 0) {
            html += `<div class="deficiencies-list">`;
            nutritionStatus.deficiencies.forEach(deficiency => {
                html += `
                <div class="deficiency-item">
                    <h4>缺乏元素: ${deficiency.nutrient || '未知'}</h4>
                    <p><strong>症状:</strong> ${deficiency.symptoms || '暂无'}</p>
                    <p><strong>补充方案:</strong> ${deficiency.treatment || '请咨询专家'}</p>
                </div>
                `;
            });
            html += `</div>`;
        }

        html += `</div>`;
        return html;
    }

    /**
     * 生成图像特征部分
     */
    generateImageFeaturesSection(imageFeatures) {
        if (!imageFeatures || Object.keys(imageFeatures).length === 0) return '';

        return `
    <div class="features-section">
        <h3><i class="fas fa-image"></i> 图像特征分析</h3>
        <div class="features-grid">
            <div class="feature-item">
                <span class="label">绿色覆盖率:</span>
                <span class="value">${imageFeatures.green_ratio || 'N/A'}</span>
            </div>
            <div class="feature-item">
                <span class="label">深绿区域:</span>
                <span class="value">${imageFeatures.dark_green_ratio || 'N/A'}</span>
            </div>
            <div class="feature-item">
                <span class="label">异常色彩:</span>
                <span class="value">${imageFeatures.yellow_ratio || 'N/A'}</span>
            </div>
            <div class="feature-item">
                <span class="label">坏死区域:</span>
                <span class="value">${imageFeatures.brown_ratio || 'N/A'}</span>
            </div>
            <div class="feature-item">
                <span class="label">图像亮度:</span>
                <span class="value">${imageFeatures.brightness || 'N/A'}</span>
            </div>
            <div class="feature-item">
                <span class="label">图像清晰度:</span>
                <span class="value">${imageFeatures.clarity || 'N/A'}</span>
            </div>
        </div>
    </div>
        `;
    }

    /**
     * 生成问题列表部分
     */
    generateIssuesSection(issues) {
        if (!issues || issues.length === 0) return '';

        let html = `
    <div class="issues-section">
        <h3><i class="fas fa-exclamation-triangle"></i> 发现的问题</h3>
        <div class="issues-list">
        `;

        issues.forEach((issue, index) => {
            const severityClass = this.getSeverityClass(issue.severity);
            html += `
            <div class="issue-item ${severityClass}">
                <div class="issue-header">
                    <h4>${index + 1}. ${issue.type || '未知问题'}</h4>
                    <span class="severity-badge ${severityClass}">
                        ${(issue.severity || 'medium').toUpperCase()}
                    </span>
                </div>
                <div class="issue-details">
                    <p><strong>描述:</strong> ${issue.description || '无描述'}</p>
                    <p><strong>解决方案:</strong> ${issue.solution || '请咨询专家'}</p>
                    ${issue.prevention ? `<p><strong>预防措施:</strong> ${issue.prevention}</p>` : ''}
                </div>
            </div>
            `;
        });

        html += `
        </div>
    </div>
        `;

        return html;
    }

    /**
     * 生成建议部分
     */
    generateRecommendationsSection(recommendations) {
        if (!recommendations || recommendations.length === 0) return '';

        let html = `
    <div class="recommendations-section">
        <h3><i class="fas fa-lightbulb"></i> 专业建议</h3>
        <div class="recommendations-list">
        `;

        recommendations.forEach((rec, index) => {
            html += `
            <div class="recommendation-item">
                <i class="fas fa-check-circle"></i>
                <span>${rec}</span>
            </div>
            `;
        });

        html += `
        </div>
    </div>
        `;

        return html;
    }

    /**
     * 获取健康评分样式
     */
    getHealthScoreStyle(score) {
        if (score >= 80) {
            return {
                background: 'background: linear-gradient(135deg, #4CAF50, #66BB6A)',
                color: '#2E7D32',
                status: '优秀'
            };
        } else if (score >= 60) {
            return {
                background: 'background: linear-gradient(135deg, #FFC107, #FFEB3B)',
                color: '#F57F17',
                status: '良好'
            };
        } else {
            return {
                background: 'background: linear-gradient(135deg, #F44336, #EF5350)',
                color: '#C62828',
                status: '需要关注'
            };
        }
    }

    /**
     * 获取紧急程度样式
     */
    getUrgencyStyle(urgency) {
        const styles = {
            low: {
                style: 'background: #4CAF50; color: white',
                icon: 'fas fa-check-circle'
            },
            medium: {
                style: 'background: #FFC107; color: white',
                icon: 'fas fa-exclamation-triangle'
            },
            high: {
                style: 'background: #F44336; color: white',
                icon: 'fas fa-exclamation-circle'
            }
        };

        return styles[urgency] || styles.medium;
    }

    /**
     * 获取严重程度样式类
     */
    getSeverityClass(severity) {
        return `severity-${severity || 'medium'}`;
    }

    /**
     * 显示错误信息
     */
    displayError(title, message) {
        const errorHTML = `
        <div class="error-report">
            <div class="error-header">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${title}</h3>
            </div>
            <div class="error-content">
                <p>${message}</p>
                <p class="error-suggestion">请检查网络连接和AI服务配置</p>
            </div>
        </div>
        `;

        this.reportContent.innerHTML = errorHTML;
    }

    /**
     * 导出报告
     */
    async exportReports() {
        if (this.currentReports.length === 0) {
            ui.addLog('warning', '没有可导出的报告');
            return;
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `ai_analysis_reports_${timestamp}.json`;

            const exportData = {
                export_time: new Date().toISOString(),
                total_reports: this.currentReports.length,
                reports: this.currentReports
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 100);

            ui.addLog('success', `报告已导出: ${filename}`);

        } catch (error) {
            console.error('导出报告失败:', error);
            ui.addLog('error', '导出报告失败');
        }
    }

    /**
     * 清空报告
     */
    clearReports() {
        if (this.currentReports.length === 0) {
            ui.addLog('info', '没有需要清空的报告');
            return;
        }

        this.currentReports = [];

        // 恢复欢迎界面
        this.reportContent.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-header">
                <i class="fas fa-robot"></i>
                <h2>农作物AI分析系统</h2>
                <p>基于阿里云百炼AI技术</p>
            </div>
            <div class="welcome-features">
                <div class="feature-item">
                    <i class="fas fa-seedling"></i>
                    <span>作物识别</span>
                </div>
                <div class="feature-item">
                    <i class="fas fa-bug"></i>
                    <span>病害诊断</span>
                </div>
                <div class="feature-item">
                    <i class="fas fa-heartbeat"></i>
                    <span>健康评估</span>
                </div>
                <div class="feature-item">
                    <i class="fas fa-chart-bar"></i>
                    <span>营养分析</span>
                </div>
            </div>
            <p class="welcome-instructions">
                请连接无人机并开始检测植物二维码<br>
                系统将自动进行云端AI分析
            </p>
        </div>
        `;

        ui.addLog('info', '报告已清空');
        ui.state.analyzedCount = 0;
        ui.updateUI();
    }

    /**
     * 获取报告统计
     */
    getReportStats() {
        return {
            totalReports: this.currentReports.length,
            avgHealthScore: this.calculateAverageHealthScore(),
            mostCommonIssues: this.getMostCommonIssues(),
            urgencyDistribution: this.getUrgencyDistribution()
        };
    }

    /**
     * 计算平均健康评分
     */
    calculateAverageHealthScore() {
        if (this.currentReports.length === 0) return 0;

        const total = this.currentReports.reduce((sum, report) => {
            return sum + (report.analysis?.health_score || 0);
        }, 0);

        return Math.round(total / this.currentReports.length);
    }

    /**
     * 获取最常见问题
     */
    getMostCommonIssues() {
        const issueCount = {};

        this.currentReports.forEach(report => {
            const issues = report.analysis?.issues || [];
            issues.forEach(issue => {
                const type = issue.type || '未知问题';
                issueCount[type] = (issueCount[type] || 0) + 1;
            });
        });

        return Object.entries(issueCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }));
    }

    /**
     * 获取紧急程度分布
     */
    getUrgencyDistribution() {
        const distribution = { low: 0, medium: 0, high: 0 };

        this.currentReports.forEach(report => {
            const urgency = report.analysis?.urgency || 'medium';
            if (distribution.hasOwnProperty(urgency)) {
                distribution[urgency]++;
            }
        });

        return distribution;
    }
}

// 创建全局报告管理器实例
const reportManager = new ReportManager();

// 导出报告管理器
window.reportManager = reportManager;