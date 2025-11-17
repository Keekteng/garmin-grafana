import { PanelPlugin } from '@grafana/data';
import { SleepAnalysisPanel } from './components/SleepAnalysisPanel';

export const plugin = new PanelPlugin(SleepAnalysisPanel);
