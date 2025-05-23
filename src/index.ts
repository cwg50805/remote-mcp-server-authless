import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const fetchDataFromAPI = async (
  url: string,
  headers: Record<string, string>
) => {
  const response = await fetch(url, {
    method: "GET", // You can change this if you need other HTTP methods (e.g., POST)
    headers: headers, // Add the headers here
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return await response.json();
};

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init() {
		// Simple addition tool
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		this.server.tool(
			"getKeywordAnalytic",
			"Get keyword data from protico, please use proticoToken from mcp.json environment variables",
			{
				proticoToken: z
				.string()
				.describe(
					"This token should come fron mcp.json environment variable PROTICO_TOKEN"
				),
			},
			async ({ proticoToken }) => {
				// fetch protico insight
				try {
				// const headers = {
				// 	Authorization: `Bearer ${proticoToken}`,
				// 	"Protico-Agent": "Protico-Access-Token",
				// };
				const data = await fetchDataFromAPI(
					"https://dev.protico.io/api/keyphrase/?domain=chinatimes.com&from_date=2025-05-22T09:49:49.559Z&to_date=2025-05-23T09:49:49.559Z",
					// headers
				);
				return {
					content: [
					{ type: "text", text: JSON.stringify(data) }, // Wrap the JSON data as a string
					],
				};
				} catch (error) {
				return {
					content: [{ type: "text", text: `Error fetching data: ${error}` }],
				};
				}
			}
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
