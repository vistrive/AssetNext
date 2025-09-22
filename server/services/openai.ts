import OpenAI from "openai";
import { type Asset, type SoftwareLicense, type AssetUtilization } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "sk-fake-key" 
});

export interface RecommendationInput {
  assets: Asset[];
  licenses: SoftwareLicense[];
  utilization: AssetUtilization[];
}

export interface AIRecommendation {
  type: "downgrade" | "upgrade" | "reallocation" | "license-optimization";
  title: string;
  description: string;
  potentialSavings: number;
  priority: "low" | "medium" | "high";
  assetIds: string[];
  reasoning: string;
}

export interface ITAMQueryContext {
  assets: Asset[];
  licenses: SoftwareLicense[];
  utilization: AssetUtilization[];
  totalAssets: number;
  activeLicenses: number;
  userQuery: string;
}

export async function generateAssetRecommendations(
  input: RecommendationInput
): Promise<AIRecommendation[]> {
  try {
    const prompt = `
Analyze the following IT asset data and provide optimization recommendations in JSON format.

Assets:
${JSON.stringify(input.assets, null, 2)}

Software Licenses:
${JSON.stringify(input.licenses, null, 2)}

Recent Utilization Data:
${JSON.stringify(input.utilization, null, 2)}

Based on this data, provide up to 5 actionable recommendations to optimize costs and efficiency. 
Consider:
1. Assets with low utilization that could be downgraded
2. Assets with high utilization that need upgrades
3. Software licenses that are over or under-allocated
4. Opportunities for asset reallocation

Return a JSON array with this structure:
{
  "recommendations": [
    {
      "type": "downgrade|upgrade|reallocation|license-optimization",
      "title": "Brief title",
      "description": "Detailed description",
      "potentialSavings": 0,
      "priority": "low|medium|high",
      "assetIds": ["array", "of", "asset", "ids"],
      "reasoning": "Explanation of the analysis"
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert IT asset management consultant. Analyze asset utilization data and provide cost optimization recommendations in the exact JSON format requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. gpt-5 doesn't support temperature parameter, do not use it.
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.recommendations || [];
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    return [];
  }
}

export async function analyzeAssetUtilization(
  asset: Asset,
  utilizationData: AssetUtilization[]
): Promise<{
  averageCpuUsage: number;
  averageRamUsage: number;
  averageDiskUsage: number;
  utilizationTrend: "increasing" | "decreasing" | "stable";
  recommendation: string;
}> {
  try {
    if (utilizationData.length === 0) {
      return {
        averageCpuUsage: 0,
        averageRamUsage: 0,
        averageDiskUsage: 0,
        utilizationTrend: "stable",
        recommendation: "No utilization data available for analysis.",
      };
    }

    const avgCpu = utilizationData.reduce((sum, data) => sum + parseFloat(data.cpuUsage || "0"), 0) / utilizationData.length;
    const avgRam = utilizationData.reduce((sum, data) => sum + parseFloat(data.ramUsage || "0"), 0) / utilizationData.length;
    const avgDisk = utilizationData.reduce((sum, data) => sum + parseFloat(data.diskUsage || "0"), 0) / utilizationData.length;

    const prompt = `
Analyze this asset's utilization pattern:

Asset: ${asset.name} (${asset.type})
Average CPU Usage: ${avgCpu.toFixed(2)}%
Average RAM Usage: ${avgRam.toFixed(2)}%
Average Disk Usage: ${avgDisk.toFixed(2)}%

Recent utilization data points: ${utilizationData.length}

Provide analysis in JSON format:
{
  "utilizationTrend": "increasing|decreasing|stable",
  "recommendation": "Brief recommendation based on utilization patterns"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an IT asset utilization analyst. Analyze usage patterns and provide recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. gpt-5 doesn't support temperature parameter, do not use it.
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      averageCpuUsage: avgCpu,
      averageRamUsage: avgRam,
      averageDiskUsage: avgDisk,
      utilizationTrend: result.utilizationTrend || "stable",
      recommendation: result.recommendation || "No specific recommendations at this time.",
    };
  } catch (error) {
    console.error("Error analyzing asset utilization:", error);
    return {
      averageCpuUsage: 0,
      averageRamUsage: 0,
      averageDiskUsage: 0,
      utilizationTrend: "stable",
      recommendation: "Unable to analyze utilization data.",
    };
  }
}

export async function processITAMQuery(context: ITAMQueryContext): Promise<string> {
  try {
    const systemPrompt = `You are an expert IT Asset Management (ITAM) consultant with deep knowledge of:
- Asset lifecycle management (procurement, deployment, maintenance, disposal)
- Software license optimization and compliance
- Hardware utilization analysis and optimization
- Cost management and budget planning
- Security and compliance requirements
- Asset tracking and inventory management
- Vendor management and procurement strategies
- Technology refresh cycles and planning

You have access to the current ITAM portal data and can provide insights about assets, licenses, utilization, reports, and strategic recommendations.

Always provide practical, actionable advice based on the real data provided. Be specific with numbers when relevant and reference actual assets/licenses when applicable.`;

    const userPrompt = `Based on the current IT Asset Management portal data, please answer this question: "${context.userQuery}"

Current ITAM Context:
- Total Assets: ${context.totalAssets}
- Active Software Licenses: ${context.activeLicenses}
- Assets Summary: ${context.assets.length} assets in database
- License Summary: ${context.licenses.length} licenses tracked
- Recent Utilization Data Points: ${context.utilization.length}

Key Assets Data:
${JSON.stringify(context.assets.slice(0, 10), null, 2)} ${context.assets.length > 10 ? `... and ${context.assets.length - 10} more assets` : ''}

Software Licenses Data:
${JSON.stringify(context.licenses.slice(0, 5), null, 2)} ${context.licenses.length > 5 ? `... and ${context.licenses.length - 5} more licenses` : ''}

Recent Utilization Data:
${JSON.stringify(context.utilization.slice(0, 5), null, 2)} ${context.utilization.length > 5 ? `... and ${context.utilization.length - 5} more data points` : ''}

Please provide a comprehensive response that directly addresses the user's question with specific insights based on this real data.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. gpt-5 doesn't support temperature parameter, do not use it.
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response to your query. Please try rephrasing your question.";
  } catch (error) {
    console.error("Error processing ITAM query:", error);
    return "I'm experiencing technical difficulties. Please try your question again in a moment.";
  }
}
