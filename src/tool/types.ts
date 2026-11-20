export type ConversionMode = 'timestamp-to-date' | 'date-to-timestamp';

export type TimezoneSelection = 'local' | 'UTC' | (string & {});

export interface TimestampToolState {
  mode: ConversionMode;
  /** Raw timestamp text input (seconds or milliseconds) for timestamp-to-date mode */
  timestampInput: string;
  /** datetime-local style input for date-to-timestamp mode */
  dateInput: string;
  /** Timezone identifier: 'local', 'UTC', or an IANA zone name */
  timezone: TimezoneSelection;
  /** Live now mode: show the current timestamp ticking every second */
  liveNow: boolean;
  /** Latest conversion result */
  output: string;
  /** Validation / conversion error message */
  error: string | null;
}

export interface TimestampToolStateLegacy {
  input: string;
  output: string;
}

export type ToolState = TimestampToolState;
