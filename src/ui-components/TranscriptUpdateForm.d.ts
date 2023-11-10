/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextAreaFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
import { Transcript } from "../models";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type TranscriptUpdateFormInputValues = {
    parent?: string;
    title?: string;
    language?: string;
    media?: string;
    status?: string;
    metadata?: string;
};
export declare type TranscriptUpdateFormValidationValues = {
    parent?: ValidationFunction<string>;
    title?: ValidationFunction<string>;
    language?: ValidationFunction<string>;
    media?: ValidationFunction<string>;
    status?: ValidationFunction<string>;
    metadata?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type TranscriptUpdateFormOverridesProps = {
    TranscriptUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    parent?: PrimitiveOverrideProps<TextFieldProps>;
    title?: PrimitiveOverrideProps<TextFieldProps>;
    language?: PrimitiveOverrideProps<TextFieldProps>;
    media?: PrimitiveOverrideProps<TextAreaFieldProps>;
    status?: PrimitiveOverrideProps<TextAreaFieldProps>;
    metadata?: PrimitiveOverrideProps<TextAreaFieldProps>;
} & EscapeHatchProps;
export declare type TranscriptUpdateFormProps = React.PropsWithChildren<{
    overrides?: TranscriptUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    transcript?: Transcript;
    onSubmit?: (fields: TranscriptUpdateFormInputValues) => TranscriptUpdateFormInputValues;
    onSuccess?: (fields: TranscriptUpdateFormInputValues) => void;
    onError?: (fields: TranscriptUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: TranscriptUpdateFormInputValues) => TranscriptUpdateFormInputValues;
    onValidate?: TranscriptUpdateFormValidationValues;
} & React.CSSProperties>;
export default function TranscriptUpdateForm(props: TranscriptUpdateFormProps): React.ReactElement;
