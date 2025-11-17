import { PanelPlugin } from '@grafana/data';
import { LLMPromptOptions } from './types';
import { LLMPanel } from './components/LLMPanel';
import { TextEditor } from 'components/TextEditor';



export const plugin = new PanelPlugin<LLMPromptOptions>(LLMPanel).setPanelOptions((builder) => {
  return builder
  .addCustomEditor({
    id: 'prompt',
    path: 'prompt',
    name: 'Prompt',
    editor: TextEditor,
    defaultValue: ''
  })
    .addBooleanSwitch({
      path: 'showPrompt',
      name: 'Display Prompt',
      description: 'Display prompt after replacing with the extracted data',
      defaultValue: false
    });
});
