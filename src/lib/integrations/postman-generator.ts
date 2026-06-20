export interface PostmanGeneratorOptions {
  workspaceName: string;
  apiKey: string;
  baseUrl: string;
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type PostmanVariable = {
  key: string;
  value: string;
  type: "string";
};

type RequestDefinition = {
  name: string;
  method: HttpMethod;
  path: string;
  description: string;
  body?: unknown;
};

type FolderDefinition = {
  name: string;
  requests: RequestDefinition[];
};

function normalizeBaseUrl(baseUrl: string) {
  return (baseUrl.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

function buildUrl(path: string) {
  const cleanPath = path.replace(/^\/+/, "");
  return `{{base_url}}/${cleanPath}`;
}

function buildRequest({ method, path, description, body }: RequestDefinition) {
  const request = {
    method,
    header:
      body === undefined
        ? undefined
        : [
            {
              key: "Content-Type",
              value: "application/json",
              type: "text",
            },
          ],
    url: buildUrl(path),
    description,
    body:
      body === undefined
        ? undefined
        : {
            mode: "raw",
            raw: JSON.stringify(body, null, 2),
            options: {
              raw: {
                language: "json",
              },
            },
          },
  };

  return Object.fromEntries(Object.entries(request).filter(([, value]) => value !== undefined));
}

function buildFolder({ name, requests }: FolderDefinition) {
  return {
    name,
    item: requests.map((request) => ({
      name: request.name,
      request: buildRequest(request),
    })),
  };
}

function buildFolders(workspaceName: string): FolderDefinition[] {
  return [
    {
      name: "Workspace",
      requests: [
        {
          name: "Get Workspace",
          method: "GET",
          path: "/api/v1/public/workspace",
          description: "Fetch active workspace details.",
        },
        {
          name: "Update Workspace",
          method: "PUT",
          path: "/api/v1/public/workspace",
          description: "Update allowed workspace fields.",
          body: {
            name: `${workspaceName} Updated`,
            callProvider: "ultravox",
            telephonyProvider: "plivo",
            customMaxUsage: 0,
            planType: "free",
          },
        },
      ],
    },
    {
      name: "Campaigns",
      requests: [
        {
          name: "List Campaigns",
          method: "GET",
          path: "/api/v1/public/campaigns",
          description: "List outreach campaigns.",
        },
        {
          name: "Create Campaign",
          method: "POST",
          path: "/api/v1/public/campaigns",
          description: "Create a campaign.",
          body: {
            name: "Sales Outreach",
            type: "OUTBOUND",
            industry: "real_estate",
            prompt: "You are a helpful sales assistant.",
            taskObjectives: "Qualify the lead and book a site visit.",
            conclusion: "Thank the lead and confirm next steps.",
            agentId: "{{agent_id}}",
            phoneNumber: "+911234567890",
            scheduleEnabled: true,
            startTime: "09:00",
            endTime: "17:00",
            concurrency: 5,
          },
        },
        {
          name: "Get Campaign",
          method: "GET",
          path: "/api/v1/public/campaigns/{{campaign_id}}",
          description: "Fetch a campaign by ID.",
        },
        {
          name: "Update Campaign",
          method: "PUT",
          path: "/api/v1/public/campaigns/{{campaign_id}}",
          description: "Update campaign fields.",
          body: {
            name: "Updated Campaign Name",
            concurrency: 8,
            scheduleEnabled: true,
          },
        },
        {
          name: "Delete Campaign",
          method: "DELETE",
          path: "/api/v1/public/campaigns/{{campaign_id}}",
          description: "Delete a campaign.",
        },
      ],
    },
    {
      name: "Agents",
      requests: [
        {
          name: "List Agents",
          method: "GET",
          path: "/api/v1/public/agents",
          description: "List voice agents.",
        },
        {
          name: "Create Agent",
          method: "POST",
          path: "/api/v1/public/agents",
          description: "Create a voice agent.",
          body: {
            name: "Sales Agent",
            gender: "FEMALE",
            voiceId: ["premium_voice_id", "basic_voice_id"],
            voiceUrl: "https://example.com/voice.mp3",
          },
        },
        {
          name: "Get Agent",
          method: "GET",
          path: "/api/v1/public/agents/{{agent_id}}",
          description: "Fetch an agent by ID.",
        },
        {
          name: "Update Agent",
          method: "PUT",
          path: "/api/v1/public/agents/{{agent_id}}",
          description: "Update agent fields.",
          body: {
            name: "Updated Agent Name",
            gender: "MALE",
            voiceId: ["premium_voice_id", "basic_voice_id"],
            voiceUrl: "https://example.com/new_voice.mp3",
          },
        },
        {
          name: "Delete Agent",
          method: "DELETE",
          path: "/api/v1/public/agents/{{agent_id}}",
          description: "Delete an agent.",
        },
      ],
    },
    {
      name: "Leads",
      requests: [
        {
          name: "List Leads",
          method: "GET",
          path: "/api/v1/public/agents/{{agent_id}}/leads",
          description: "List leads for an agent.",
        },
        {
          name: "Create Lead",
          method: "POST",
          path: "/api/v1/public/agents/{{agent_id}}/leads",
          description: "Create one lead.",
          body: {
            name: "Lead Name",
            email: "lead@example.com",
            phone: "+911234567890",
            description: "Lead description",
          },
        },
        {
          name: "Get Lead",
          method: "GET",
          path: "/api/v1/public/agents/{{agent_id}}/leads/{{lead_id}}",
          description: "Fetch a lead by ID.",
        },
        {
          name: "Update Lead",
          method: "PUT",
          path: "/api/v1/public/agents/{{agent_id}}/leads/{{lead_id}}",
          description: "Update lead fields.",
          body: {
            name: "Updated Lead Name",
            email: "updated@example.com",
            phone: "+911234567890",
            description: "Updated description",
          },
        },
        {
          name: "Delete Lead",
          method: "DELETE",
          path: "/api/v1/public/agents/{{agent_id}}/leads/{{lead_id}}",
          description: "Delete a lead.",
        },
      ],
    },
    {
      name: "Calls",
      requests: [
        {
          name: "List Calls",
          method: "GET",
          path: "/api/v1/public/agents/{{agent_id}}/calls",
          description: "List calls for an agent.",
        },
        {
          name: "Get Call",
          method: "GET",
          path: "/api/v1/public/agents/{{agent_id}}/calls/{{call_id}}",
          description: "Fetch a call by ID.",
        },
        {
          name: "Start Call",
          method: "POST",
          path: "/api/v1/public/agents/{{agent_id}}/calls",
          description: "Start a call. Endpoint can return 501 until enabled.",
          body: {
            phone: "+911234567890",
            name: "Lead Name",
            description: "Optional context for the agent",
          },
        },
      ],
    },
  ];
}

export function generatePostmanCollection(options: PostmanGeneratorOptions) {
  const workspaceName = options.workspaceName.trim() || "Workspace";
  const variables: PostmanVariable[] = [
    {
      key: "base_url",
      value: normalizeBaseUrl(options.baseUrl),
      type: "string",
    },
    {
      key: "outcaller_api_key",
      value: options.apiKey,
      type: "string",
    },
    {
      key: "agent_id",
      value: "",
      type: "string",
    },
    {
      key: "campaign_id",
      value: "",
      type: "string",
    },
    {
      key: "lead_id",
      value: "",
      type: "string",
    },
    {
      key: "call_id",
      value: "",
      type: "string",
    },
  ];

  return {
    info: {
      name: `OutCallerAI - ${workspaceName}`,
      description:
        "Import this collection, confirm collection variables, then run public API requests.",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    auth: {
      type: "bearer",
      bearer: [
        {
          key: "token",
          value: "{{outcaller_api_key}}",
          type: "string",
        },
      ],
    },
    variable: variables,
    item: buildFolders(workspaceName).map(buildFolder),
  };
}
