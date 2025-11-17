import React, { useEffect, useState } from 'react';
import { useAsync } from 'react-use';
import { Spinner, useTheme2, Button, Alert } from '@grafana/ui';
import { LoadingState, PanelProps } from '@grafana/data';
import { openai, llm } from '@grafana/llm';
import { LLMPromptOptions } from 'types';



export const LLMPanel: React.FC<PanelProps<LLMPromptOptions>> = ({ data, width, height, timeRange, options }: PanelProps<LLMPromptOptions>) => {
    const theme = useTheme2();
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [trigger, setTrigger] = useState(0);
    const [analysis, setAnalysis] = useState('');

    const PROMPT: string = options.prompt
    const [displayPrompt, setDisplayPrompt] = useState(PROMPT)

    const [dataDictionary, setDataDictionary] = useState(data)


    const isDataLoaded = () => { return dataDictionary.state === LoadingState.Done; };

    const extractDataAlias = () => {
        if (!isDataLoaded()) {
            return [];
        }
        const pattern = /\{\{(.*?)\}\}/g;
        const matches = Array.from(PROMPT.matchAll(pattern));
        return matches.map(match => match[1].trim());
    }

    const replaceDataAliasWithData = (alias: string) => {
        if (!isDataLoaded()) {
            setDisplayPrompt(PROMPT);
            return;
        }

        let extractedData = data.series.find(s => s.refId === alias);
        if (extractedData === undefined) {
            // setRefreshCounter(refreshCounter+1)
            setDisplayPrompt(PROMPT);
            return;
        }
        // Data must be rounded and process in the grafana query. No processing will be done here
        const extractedDataString = extractedData.fields[0].values
            // Iterate through the rows 
            .map((_, i) =>
                extractedData.fields
                    // Iterate through the fields in each row Eg: Field 1: XXX, Field 2: XXX, Field 3: XXX
                    .map(field => `${field.name}: ${field.values[i]}`)
                    .join(', ')
            )
            // Join the different rows
            .join('\n');
        let toReplace: string = '{{' + alias + '}}';

        setDisplayPrompt(PROMPT.replace(toReplace, extractedDataString));
    }

    const replacePromptWithData = () => {
        let aliases = extractDataAlias();
        aliases.forEach(a => replaceDataAliasWithData(a));
    }

    
    const { loading, error } = useAsync(async () => {
        if (trigger === 0 || !isDataLoaded()) {
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
                        content: displayPrompt
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
        setShowAnalysis(true)
        setTrigger(x => x + 1)
    }

    useEffect(() => setDisplayPrompt(PROMPT), [PROMPT]);
    useEffect(() => setDataDictionary(data), [data]);
    useEffect(() => {
        if (isDataLoaded()){
            replacePromptWithData()
        }
    },[dataDictionary, displayPrompt])

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%', // Fill all available height from parent
            minHeight: 'max-content', // Ensures parent is at least as tall as its content
            gap: '1rem',
        }}>
            {/* Analysis Button */}
            <div style={{ textAlign: 'center' }}>
                <Button
                    onClick={onClickAnalysis}
                    disabled={loading || data.state !== LoadingState.Done}
                    icon={showAnalysis ? 'chart-line' : 'ai'}
                    size="md"
                >
                    {loading ? 'Analyzing...' : showAnalysis ? 'Refresh Analysis' : '🤖 Analyze'}
                </Button>
                {showAnalysis && (
                    <Button
                        onClick={() => setShowAnalysis(false)}
                        variant="secondary"
                        size="md"
                    >
                        Clear Analysis
                    </Button>
                )}
            </div>
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                height: '100%', // Fill all available height from parent
                gap: '1rem',
            }}>
                {/* Prompt Text */}
                {options.showPrompt &&
                    (
                        <div style={{
                            flex: 1,
                            overflow: 'auto',
                            overflowWrap: 'break-word', // Modern property for word wrapping
                            whiteSpace: 'normal', // Ensures text wraps normally
                            overflowX: 'hidden', // Prevents horizontal scrolling
                            backgroundColor: theme.colors.background.secondary,
                            padding: '1rem',
                            borderRadius: '4px',
                            border: `1px solid ${theme.colors.border.weak}`,
                            minHeight: 0,
                            width:'100%'
                        }}>
                            <p>{displayPrompt}</p>
                        </div>
                    )
                }
                {/* Prompt Output */}
                {((trigger > 0 && showAnalysis) || true) &&
                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        overflowWrap: 'break-word', // Modern property for word wrapping
                        whiteSpace: 'normal', // Ensures text wraps normally
                        overflowX: 'hidden', // Prevents horizontal scrolling
                        backgroundColor: theme.colors.background.secondary,
                        padding: '1rem',
                        borderRadius: '4px',
                        border: `1px solid ${theme.colors.border.weak}`,
                        minHeight: 0,
                        width:'100%'
                    }}>
                        {error && <Alert title="Error" severity="error">{error.message}</Alert>}
                        {loading && (
                            <div>
                                <Spinner />
                                <p>Analyzing...</p>
                            </div>
                        )}
                        {!loading && analysis && (
                            <div>
                                <h4>Analysis</h4>
                                <p>{analysis}</p>
                            </div>
                        )}
                    </div>}
            </div>
        </div>
    )
}
