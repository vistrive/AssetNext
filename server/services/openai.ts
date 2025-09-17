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
      temperature: 0.7,
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
