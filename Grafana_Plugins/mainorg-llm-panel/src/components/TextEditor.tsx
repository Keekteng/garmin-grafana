import React from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Field, TextArea } from '@grafana/ui';



export const TextEditor: React.FC<StandardEditorProps<string>> = ({value, onChange}) => {

    return (
        <Field label="" description="Write your prompt here">
            <TextArea name="prompt" required value={value} onChange={e => onChange(e.currentTarget.value)} />
        </Field>
    )

}
