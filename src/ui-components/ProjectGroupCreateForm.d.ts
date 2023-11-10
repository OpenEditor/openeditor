/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextAreaFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
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
export declare type ProjectGroupCreateFormInputValues = {
    title?: string;
    users?: string[];
    status?: string;
    metadata?: string;
};
export declare type ProjectGroupCreateFormValidationValues = {
    title?: ValidationFunction<string>;
    users?: ValidationFunction<string>;
    status?: ValidationFunction<string>;
    metadata?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ProjectGroupCreateFormOverridesProps = {
    ProjectGroupCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    title?: PrimitiveOverrideProps<TextFieldProps>;
    users?: PrimitiveOverrideProps<TextFieldProps>;
    status?: PrimitiveOverrideProps<TextAreaFieldProps>;
    metadata?: PrimitiveOverrideProps<TextAreaFieldProps>;
} & EscapeHatchProps;
export declare type ProjectGroupCreateFormProps = React.PropsWithChildren<{
    overrides?: ProjectGroupCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: ProjectGroupCreateFormInputValues) => ProjectGroupCreateFormInputValues;
    onSuccess?: (fields: ProjectGroupCreateFormInputValues) => void;
    onError?: (fields: ProjectGroupCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ProjectGroupCreateFormInputValues) => ProjectGroupCreateFormInputValues;
    onValidate?: ProjectGroupCreateFormValidationValues;
} & React.CSSProperties>;
export default function ProjectGroupCreateForm(props: ProjectGroupCreateFormProps): React.ReactElement;
