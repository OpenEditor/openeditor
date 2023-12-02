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
export declare type FolderCreateFormInputValues = {
    parent?: string;
    title?: string;
    status?: string;
    metadata?: string;
    project?: string;
};
export declare type FolderCreateFormValidationValues = {
    parent?: ValidationFunction<string>;
    title?: ValidationFunction<string>;
    status?: ValidationFunction<string>;
    metadata?: ValidationFunction<string>;
    project?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type FolderCreateFormOverridesProps = {
    FolderCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    parent?: PrimitiveOverrideProps<TextFieldProps>;
    title?: PrimitiveOverrideProps<TextFieldProps>;
    status?: PrimitiveOverrideProps<TextAreaFieldProps>;
    metadata?: PrimitiveOverrideProps<TextAreaFieldProps>;
    project?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type FolderCreateFormProps = React.PropsWithChildren<{
    overrides?: FolderCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: FolderCreateFormInputValues) => FolderCreateFormInputValues;
    onSuccess?: (fields: FolderCreateFormInputValues) => void;
    onError?: (fields: FolderCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: FolderCreateFormInputValues) => FolderCreateFormInputValues;
    onValidate?: FolderCreateFormValidationValues;
} & React.CSSProperties>;
export default function FolderCreateForm(props: FolderCreateFormProps): React.ReactElement;
