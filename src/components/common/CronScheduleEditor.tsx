import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import cronstrue from 'cronstrue';
import { useState } from 'react';

type CronMode = 'daily' | 'weekly' | 'monthly' | 'advanced';

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

interface ParsedSchedule {
  mode: CronMode;
  hour: number;
  minute: number;
  dayOfWeek: string;
  dayOfMonth: string;
}

const DEFAULT_PARSED: ParsedSchedule = {
  mode: 'advanced',
  hour: 0,
  minute: 0,
  dayOfWeek: '0',
  dayOfMonth: '1',
};

// CNPG's spec.schedule is a 6-field cron (with a leading seconds field, unlike standard 5-field
// crontab) — only recognize the common "simple" shapes this editor itself generates (fixed
// second, numeric hour/minute, "*" month) as daily/weekly/monthly; anything else — including
// step/range expressions or hand-written cron — falls back to the raw advanced editor rather than
// trying to fully round-trip arbitrary cron syntax.
function parseSchedule(schedule: string): ParsedSchedule {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 6) {
    return DEFAULT_PARSED;
  }
  const [sec, min, hour, dom, month, dow] = parts;
  const isNum = (s: string) => /^\d+$/.test(s);

  if (sec === '0' && isNum(min) && isNum(hour) && month === '*') {
    if (dom === '*' && dow === '*') {
      return {
        mode: 'daily',
        hour: Number(hour),
        minute: Number(min),
        dayOfWeek: '0',
        dayOfMonth: '1',
      };
    }
    if (dom === '*' && isNum(dow)) {
      return {
        mode: 'weekly',
        hour: Number(hour),
        minute: Number(min),
        dayOfWeek: dow,
        dayOfMonth: '1',
      };
    }
    if (dow === '*' && isNum(dom)) {
      return {
        mode: 'monthly',
        hour: Number(hour),
        minute: Number(min),
        dayOfWeek: '0',
        dayOfMonth: dom,
      };
    }
  }
  return DEFAULT_PARSED;
}

function buildSchedule(
  mode: CronMode,
  hour: number,
  minute: number,
  dayOfWeek: string,
  dayOfMonth: string
): string {
  switch (mode) {
    case 'daily':
      return `0 ${minute} ${hour} * * *`;
    case 'weekly':
      return `0 ${minute} ${hour} * * ${dayOfWeek}`;
    case 'monthly':
      return `0 ${minute} ${hour} ${dayOfMonth} * *`;
    default:
      return `0 ${minute} ${hour} * * *`;
  }
}

function describeSchedule(schedule: string): string | undefined {
  try {
    return cronstrue.toString(schedule);
  } catch {
    return undefined;
  }
}

export function CronScheduleEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseSchedule(value);
  const { hour, minute, dayOfWeek, dayOfMonth } = parsed;
  const description = describeSchedule(value);

  // Mode is normally derived from `value` (parseSchedule), but "advanced" can't be represented
  // that way — a value the user typed in advanced mode may still happen to match a simple
  // daily/weekly/monthly shape (e.g. "0 0 0 * * *"), which would otherwise bounce the toggle
  // straight back out of advanced. This override tracks the user's explicit mode choice instead.
  const [modeOverride, setModeOverride] = useState<CronMode | null>(null);
  const mode = modeOverride ?? parsed.mode;

  function handleModeChange(newMode: CronMode | null) {
    if (!newMode || newMode === mode) {
      return;
    }
    setModeOverride(newMode);
    if (newMode !== 'advanced') {
      onChange(buildSchedule(newMode, hour, minute, dayOfWeek, dayOfMonth));
    }
  }

  return (
    <Stack spacing={1} sx={{ mt: 2, mb: 1 }}>
      <Typography variant="subtitle2">Schedule</Typography>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={mode}
        onChange={(_e, newMode) => handleModeChange(newMode)}
      >
        <ToggleButton value="daily">Daily</ToggleButton>
        <ToggleButton value="weekly">Weekly</ToggleButton>
        <ToggleButton value="monthly">Monthly</ToggleButton>
        <ToggleButton value="advanced">Advanced (raw cron)</ToggleButton>
      </ToggleButtonGroup>

      {mode !== 'advanced' && (
        <Stack direction="row" spacing={2}>
          {mode === 'weekly' && (
            <FormControl margin="normal" sx={{ minWidth: 160 }}>
              <InputLabel id="cron-day-of-week-label">Day of week</InputLabel>
              <Select
                labelId="cron-day-of-week-label"
                label="Day of week"
                value={dayOfWeek}
                onChange={e =>
                  onChange(buildSchedule(mode, hour, minute, e.target.value, dayOfMonth))
                }
              >
                {DAYS_OF_WEEK.map(day => (
                  <MenuItem key={day.value} value={day.value}>
                    {day.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {mode === 'monthly' && (
            <FormControl margin="normal" sx={{ minWidth: 160 }}>
              <InputLabel id="cron-day-of-month-label">Day of month</InputLabel>
              <Select
                labelId="cron-day-of-month-label"
                label="Day of month"
                value={dayOfMonth}
                onChange={e =>
                  onChange(buildSchedule(mode, hour, minute, dayOfWeek, e.target.value))
                }
              >
                {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(day => (
                  <MenuItem key={day} value={day}>
                    {day}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl margin="normal" sx={{ minWidth: 120 }}>
            <InputLabel id="cron-hour-label">Hour</InputLabel>
            <Select
              labelId="cron-hour-label"
              label="Hour"
              value={hour}
              onChange={e =>
                onChange(buildSchedule(mode, Number(e.target.value), minute, dayOfWeek, dayOfMonth))
              }
            >
              {Array.from({ length: 24 }, (_, i) => i).map(h => (
                <MenuItem key={h} value={h}>
                  {String(h).padStart(2, '0')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl margin="normal" sx={{ minWidth: 120 }}>
            <InputLabel id="cron-minute-label">Minute</InputLabel>
            <Select
              labelId="cron-minute-label"
              label="Minute"
              value={minute}
              onChange={e =>
                onChange(buildSchedule(mode, hour, Number(e.target.value), dayOfWeek, dayOfMonth))
              }
            >
              {Array.from({ length: 60 }, (_, i) => i).map(m => (
                <MenuItem key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}

      {mode === 'advanced' && (
        <TextField
          fullWidth
          margin="normal"
          label="Cron expression (6 fields: sec min hour day month weekday)"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0 0 0 * * *"
          sx={{ '& input': { fontFamily: 'monospace' } }}
        />
      )}

      <Typography variant="body2" color="text.secondary">
        {value} {description ? `— ${description}` : ''}
      </Typography>
    </Stack>
  );
}
