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
INSERT INTO "widget_publication" ("id", "version", "config", "publishedAt", "widgetId", "createdByUserId")
SELECT
	"id" || ':v1',
	1,
	jsonb_build_object('schemaVersion', 1, 'config', jsonb_build_object(
		'booking', jsonb_build_object(
			'enabled', "bookingEnabled",
			'timezone', "bookingTimezone",
			'durationMinutes', "bookingDurationMinutes",
			'minimumNoticeMinutes', "bookingMinimumNoticeMinutes",
			'workingHours', pg_temp.widget_json_object_or_default("bookingWorkingHours")
		),
		'displayName', "displayName",
		'welcomeMessage', "welcomeMessage",
		'inputPlaceholder', "inputPlaceholder",
		'primaryColor', "primaryColor",
		'backgroundColor', "backgroundColor",
		'textColor', "textColor",
		'borderColor', "borderColor",
		'fontFamily', "fontFamily",
		'fontSize', "fontSize",
		'position', "position",
		'launcherSize', "launcherSize",
		'panelWidth', "panelWidth",
		'panelHeight', "panelHeight",
		'borderRadius', "borderRadius",
		'borderRadiusStyle', "borderRadiusStyle",
		'logoUrl', "logoUrl",
		'instructions', "instructions",
		'escalationKeywords', "escalationKeywords",
		'modelProvider', "modelProvider",
		'modelName', "modelName",
		'theme', "theme",
		'userBubbleColor', "userBubbleColor",
		'userBubbleTextColor', "userBubbleTextColor",
		'botBubbleColor', "botBubbleColor",
		'botBubbleTextColor', "botBubbleTextColor",
		'headerGradientFrom', "headerGradientFrom",
		'headerGradientTo', "headerGradientTo",
		'shadowSize', "shadowSize",
		'suggestions', pg_temp.widget_json_array_or_empty("suggestions", 10, 500),
		'hideSuggestionsOnInteract', "hideSuggestionsOnInteract",
		'previewMessages', pg_temp.widget_json_array_or_empty("previewMessages", 10, 500),
		'autoShowPreviewDelay', "autoShowPreviewDelay",
		'showBranding', "showBranding",
		'privacyPolicyUrl', "privacyPolicyUrl",
		'enableLeadCapture', "enableLeadCapture",
		'leadCaptureKeywords', pg_temp.widget_json_array_or_empty("leadCaptureKeywords", 20, 100),
		'leadCaptureMinutesThreshold', "leadCaptureMinutesThreshold",
		'leadCaptureMessageThreshold', "leadCaptureMessageThreshold",
		'enableBrochure', "enableBrochure",
		'brochureSuggestionText', "brochureSuggestionText"
	)),
	"updatedAt",
	"id",
	NULL
FROM "widget";--> statement-breakpoint
UPDATE "widget" SET "publishedVersion" = 1;--> statement-breakpoint
DROP FUNCTION pg_temp.widget_json_array_or_empty(text, integer, integer);--> statement-breakpoint
DROP FUNCTION pg_temp.widget_json_object_or_default(text);
