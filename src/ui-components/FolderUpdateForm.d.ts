/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextAreaFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
import { Folder } from "../models";
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
export declare type FolderUpdateFormInputValues = {
    parent?: string;
    title?: string;
    status?: string;
    metadata?: string;
    project?: string;
};
export declare type FolderUpdateFormValidationValues = {
    parent?: ValidationFunction<string>;
    title?: ValidationFunction<string>;
    status?: ValidationFunction<string>;
    metadata?: ValidationFunction<string>;
    project?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type FolderUpdateFormOverridesProps = {
    FolderUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    parent?: PrimitiveOverrideProps<TextFieldProps>;
    title?: PrimitiveOverrideProps<TextFieldProps>;
    status?: PrimitiveOverrideProps<TextAreaFieldProps>;
    metadata?: PrimitiveOverrideProps<TextAreaFieldProps>;
    project?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type FolderUpdateFormProps = React.PropsWithChildren<{
    overrides?: FolderUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    folder?: Folder;
    onSubmit?: (fields: FolderUpdateFormInputValues) => FolderUpdateFormInputValues;
    onSuccess?: (fields: FolderUpdateFormInputValues) => void;
    onError?: (fields: FolderUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: FolderUpdateFormInputValues) => FolderUpdateFormInputValues;
    onValidate?: FolderUpdateFormValidationValues;
} & React.CSSProperties>;
export default function FolderUpdateForm(props: FolderUpdateFormProps): React.ReactElement;
