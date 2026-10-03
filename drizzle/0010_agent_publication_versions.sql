CREATE TABLE "widget_publication" (
	"id" text PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"config" jsonb NOT NULL,
	"publishedAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"widgetId" text NOT NULL,
	"createdByUserId" text
);
--> statement-breakpoint
ALTER TABLE "widget" ADD COLUMN "publishedVersion" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "widget_publication" ADD CONSTRAINT "widget_publication_widgetId_widget_id_fk" FOREIGN KEY ("widgetId") REFERENCES "public"."widget"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "widget_publication" ADD CONSTRAINT "widget_publication_createdByUserId_user_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "widget_publication_widgetId_version_key" ON "widget_publication" USING btree ("widgetId","version");--> statement-breakpoint
CREATE INDEX "widget_publication_widgetId_publishedAt_idx" ON "widget_publication" USING btree ("widgetId","publishedAt");--> statement-breakpoint
CREATE FUNCTION pg_temp.widget_json_array_or_empty(value text, max_items integer, max_chars integer) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE parsed jsonb;
BEGIN
	parsed := value::jsonb;
	IF jsonb_typeof(parsed) = 'array' THEN
		RETURN COALESCE((
			SELECT jsonb_agg(item.value ORDER BY item.ordinality)
			FROM jsonb_array_elements(parsed) WITH ORDINALITY AS item(value, ordinality)
			WHERE jsonb_typeof(item.value) = 'string'
				AND item.ordinality <= max_items
				AND char_length(item.value #>> '{}') <= max_chars
		), '[]'::jsonb);
	END IF;
	RETURN '[]'::jsonb;
EXCEPTION WHEN others THEN
	RETURN '[]'::jsonb;
END;
$$;--> statement-breakpoint
CREATE FUNCTION pg_temp.widget_json_object_or_default(value text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
	parsed jsonb;
	weekdays jsonb;
BEGIN
	parsed := value::jsonb;
	IF jsonb_typeof(parsed) = 'object'
		AND jsonb_typeof(parsed->'start') = 'string'
		AND jsonb_typeof(parsed->'end') = 'string'
		AND parsed->>'start' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
		AND parsed->>'end' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
		AND jsonb_typeof(parsed->'weekdays') = 'array'
		AND jsonb_array_length(parsed->'weekdays') > 0 THEN
		SELECT COALESCE(jsonb_agg(item.value ORDER BY item.ordinality), '[]'::jsonb)
		INTO weekdays
		FROM jsonb_array_elements(parsed->'weekdays') WITH ORDINALITY AS item(value, ordinality)
		WHERE jsonb_typeof(item.value) = 'number'
			AND item.value::text ~ '^[0-6]$';
		IF jsonb_array_length(weekdays) > 0 THEN
			RETURN jsonb_build_object('start', parsed->'start', 'end', parsed->'end', 'weekdays', weekdays);
		END IF;
	END IF;
	RETURN '{"start":"09:00","end":"17:00","weekdays":[1,2,3,4,5]}'::jsonb;
EXCEPTION WHEN others THEN
	RETURN '{"start":"09:00","end":"17:00","weekdays":[1,2,3,4,5]}'::jsonb;
END;
$$;--> statement-breakpoint
CREATE FUNCTION pg_temp.widget_text_or_default(value text, max_chars integer, fallback text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE normalized text;
BEGIN
	normalized := left(btrim(value), max_chars);
	RETURN COALESCE(NULLIF(normalized, ''), fallback);
END;
$$;--> statement-breakpoint
CREATE FUNCTION pg_temp.widget_color_or_default(value text, fallback text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
	IF value ~ '^#[0-9a-fA-F]{6}$' THEN RETURN value; END IF;
	RETURN fallback;
END;
$$;--> statement-breakpoint
CREATE FUNCTION pg_temp.widget_enum_or_default(value text, allowed text[], fallback text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
	IF value = ANY(allowed) THEN RETURN value; END IF;
	RETURN fallback;
END;
$$;--> statement-breakpoint
CREATE FUNCTION pg_temp.widget_int_or_default(value integer, minimum integer, maximum integer, fallback integer) RETURNS integer
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
	IF value BETWEEN minimum AND maximum THEN RETURN value; END IF;
	RETURN fallback;
END;
$$;--> statement-breakpoint
INSERT INTO "widget_publication" ("id", "version", "config", "publishedAt", "widgetId", "createdByUserId")
SELECT
	"id" || ':v1',
	1,
	jsonb_build_object('schemaVersion', 1, 'config', jsonb_build_object(
		'booking', jsonb_build_object(
			'enabled', "bookingEnabled",
			'timezone', pg_temp.widget_text_or_default("bookingTimezone", 80, 'UTC'),
			'durationMinutes', pg_temp.widget_int_or_default("bookingDurationMinutes", 15, 240, 30),
			'minimumNoticeMinutes', pg_temp.widget_int_or_default("bookingMinimumNoticeMinutes", 0, 10080, 60),
			'workingHours', pg_temp.widget_json_object_or_default("bookingWorkingHours")
		),
		'displayName', pg_temp.widget_text_or_default("displayName", 60, 'Support'),
		'welcomeMessage', pg_temp.widget_text_or_default("welcomeMessage", 240, 'Hi! How can we help?'),
		'inputPlaceholder', pg_temp.widget_text_or_default("inputPlaceholder", 80, 'Ask a question…'),
		'primaryColor', pg_temp.widget_color_or_default("primaryColor", '#7c3aed'),
		'backgroundColor', pg_temp.widget_color_or_default("backgroundColor", '#ffffff'),
		'textColor', pg_temp.widget_color_or_default("textColor", '#171717'),
		'borderColor', pg_temp.widget_color_or_default("borderColor", '#EAECF0'),
		'fontFamily', pg_temp.widget_enum_or_default("fontFamily", ARRAY['Inter', 'Geist', 'System UI', 'Roboto', 'Open Sans'], 'Inter'),
		'fontSize', pg_temp.widget_enum_or_default("fontSize", ARRAY['12px', '13px', '14px', '15px', '16px'], '14px'),
		'position', pg_temp.widget_enum_or_default("position", ARRAY['bottom-left', 'bottom-right'], 'bottom-right'),
		'launcherSize', pg_temp.widget_enum_or_default("launcherSize", ARRAY['sm', 'md', 'lg'], 'md'),
		'panelWidth', pg_temp.widget_int_or_default("panelWidth", 280, 640, 380),
		'panelHeight', pg_temp.widget_int_or_default("panelHeight", 400, 900, 640),
		'borderRadius', pg_temp.widget_int_or_default("borderRadius", 0, 48, 20),
		'borderRadiusStyle', pg_temp.widget_enum_or_default("borderRadiusStyle", ARRAY['none', 'default', 'full'], 'default'),
		'logoUrl', "logoUrl",
		'instructions', pg_temp.widget_text_or_default("instructions", 4000, 'Answer clearly and only use information you know is reliable. If you are unsure, say so.'),
		'escalationKeywords', pg_temp.widget_text_or_default("escalationKeywords", 500, 'human,agent,person,representative,support team'),
		'modelProvider', pg_temp.widget_enum_or_default("modelProvider", ARRAY['OPENAI', 'GOOGLE'], 'OPENAI'),
		'modelName', CASE
			WHEN pg_temp.widget_enum_or_default("modelProvider", ARRAY['OPENAI', 'GOOGLE'], 'OPENAI') = 'GOOGLE'
				AND "modelName" IN ('gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro') THEN "modelName"
			WHEN pg_temp.widget_enum_or_default("modelProvider", ARRAY['OPENAI', 'GOOGLE'], 'OPENAI') = 'GOOGLE' THEN 'gemini-2.5-flash'
			WHEN "modelName" IN ('gpt-4o-mini', 'gpt-4o', 'gpt-5-mini', 'gpt-5.1') THEN "modelName"
			ELSE 'gpt-4o-mini'
		END,
		'theme', pg_temp.widget_enum_or_default("theme", ARRAY['light', 'dark'], 'light'),
		'userBubbleColor', pg_temp.widget_color_or_default("userBubbleColor", '#7c3aed'),
		'userBubbleTextColor', pg_temp.widget_color_or_default("userBubbleTextColor", '#ffffff'),
		'botBubbleColor', pg_temp.widget_color_or_default("botBubbleColor", '#f2f2f8'),
		'botBubbleTextColor', pg_temp.widget_color_or_default("botBubbleTextColor", '#171717'),
		'headerGradientFrom', pg_temp.widget_color_or_default("headerGradientFrom", '#7c3aed'),
		'headerGradientTo', pg_temp.widget_color_or_default("headerGradientTo", '#7c3aed'),
		'shadowSize', pg_temp.widget_enum_or_default("shadowSize", ARRAY['none', 'md', 'lg'], 'md'),
		'suggestions', pg_temp.widget_json_array_or_empty("suggestions", 10, 500),
		'hideSuggestionsOnInteract', "hideSuggestionsOnInteract",
		'previewMessages', pg_temp.widget_json_array_or_empty("previewMessages", 10, 500),
		'autoShowPreviewDelay', pg_temp.widget_int_or_default("autoShowPreviewDelay", 0, 30000, 3000),
		'showBranding', "showBranding",
		'privacyPolicyUrl', left("privacyPolicyUrl", 500),
		'enableLeadCapture', "enableLeadCapture",
		'leadCaptureKeywords', pg_temp.widget_json_array_or_empty("leadCaptureKeywords", 20, 100),
		'leadCaptureMinutesThreshold', pg_temp.widget_int_or_default("leadCaptureMinutesThreshold", 1, 120, 5),
		'leadCaptureMessageThreshold', pg_temp.widget_int_or_default("leadCaptureMessageThreshold", 1, 100, 4),
		'enableBrochure', "enableBrochure",
		'brochureSuggestionText', pg_temp.widget_text_or_default("brochureSuggestionText", 120, 'Receive Brochure')
	)),
	"updatedAt",
	"id",
	NULL
FROM "widget";--> statement-breakpoint
UPDATE "widget" SET "publishedVersion" = 1;--> statement-breakpoint
DROP FUNCTION pg_temp.widget_json_array_or_empty(text, integer, integer);--> statement-breakpoint
DROP FUNCTION pg_temp.widget_json_object_or_default(text);--> statement-breakpoint
DROP FUNCTION pg_temp.widget_text_or_default(text, integer, text);--> statement-breakpoint
DROP FUNCTION pg_temp.widget_color_or_default(text, text);--> statement-breakpoint
DROP FUNCTION pg_temp.widget_enum_or_default(text, text[], text);--> statement-breakpoint
DROP FUNCTION pg_temp.widget_int_or_default(integer, integer, integer, integer);
