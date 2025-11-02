import React, { useState } from 'react';
import { useAsync } from 'react-use';
import { useTheme2 } from '@grafana/ui';
import { PanelProps } from '@grafana/data';
import { openai, llm } from '@grafana/llm';
import { Button, Alert } from '@grafana/ui';
import { LLMPromptOptions } from 'types';

// interface ChatOutputProps {
//     error: Error | undefined;
//     loading: boolean;
//     analysis: string;

// }



export const LLMPanel: React.FC<PanelProps<LLMPromptOptions>> = ({ data, width, height, timeRange, options }: PanelProps<LLMPromptOptions>) => {
  const theme = useTheme2();
  const [trigger, setTrigger] = useState(0);
  const [analysis, setAnalysis] = useState('');

  var prompt: string = options.prompt;

  const extractDataAlias = () => {
    if (!data.series || data.series.length === 0) {
      return [];
    }
    const pattern = /\{\{(.*?)\}\}/g;
    const matches = Array.from(prompt.matchAll(pattern));
    return matches.map(match => match[1].trim());
  }

  const replaceDataAliasWithData = (alias: string) => {
    if (!data.series || data.series.length === 0) {
      return [];
    }

    var extractedData = data.series.find(s => s.refId === alias);
    if (extractedData === undefined) {
      prompt = data.series.map(s => s.refId).join(',');
      return;
    }
    var extractedDataString = extractedData.fields[1].values.join(',');
    var toReplace: string = '{{' + alias + '}}';
    prompt = prompt.replace(toReplace, extractedDataString);
  }

  var aliases = extractDataAlias();
  aliases.forEach(a => replaceDataAliasWithData(a));

  const { loading, error } = useAsync(async () => {
    if (trigger === 0) {
      return;
    }

    const enabled = await llm.enabled();
    if (!enabled) {
      setAnalysis('❌ LLM is not enabled. Please check your Grafana LLM configuration.');
      return;
    }

    const stream = openai
      .streamChatCompletions({
        model: openai.Model.BASE,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: `Analyse this`
          },
        ],
      })
      .pipe(openai.accumulateContent());

    return stream.subscribe(setAnalysis);
  }, [trigger]);

  const onClickAnalysis = () => {
    setTrigger(x => x + 1)
  }

  return (
    <div>
      {/* Analysis Button */}
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <Button
          onClick={onClickAnalysis}
          disabled={loading}
          size="md"
        >
          {loading ? 'Analyzing...' : '🤖 Analyze'}
        </Button>
      </div>
      {options.showPrompt &&
        (
          <div style={{
            flex: '1 0 10%',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            backgroundColor: theme.colors.background.secondary,
            padding: '15px',
            borderRadius: '4px',
            border: `1px solid ${theme.colors.border.weak}`
          }}>
            {prompt}
          </div>
        )
      }

      <div style={{
        flex: '1 0 10%',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        backgroundColor: theme.colors.background.secondary,
        padding: '15px',
        borderRadius: '4px',
        border: `1px solid ${theme.colors.border.weak}`
      }}>
        {analysis}
      </div>
    </div>
  )
}
