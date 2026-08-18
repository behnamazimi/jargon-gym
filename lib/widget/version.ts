import widgetVersion from "@/widget/version.json";

/** Single source of truth for the widget's release counter — also read by
 *  scripts/widget-zip.sh to stamp shipped copies of config.json. Bump this
 *  file, not a duplicated constant, when cutting a new widget release. */
export const LATEST_WIDGET_VERSION: string = widgetVersion.version;
