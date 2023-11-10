/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextAreaFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
import { ProjectGroup } from "../models";
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
export declare type ProjectGroupUpdateFormInputValues = {
    title?: string;
    users?: string[];
    status?: string;
    metadata?: string;
};
export declare type ProjectGroupUpdateFormValidationValues = {
    title?: ValidationFunction<string>;
    users?: ValidationFunction<string>;
    status?: ValidationFunction<string>;
    metadata?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ProjectGroupUpdateFormOverridesProps = {
    ProjectGroupUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    title?: PrimitiveOverrideProps<TextFieldProps>;
    users?: PrimitiveOverrideProps<TextFieldProps>;
    status?: PrimitiveOverrideProps<TextAreaFieldProps>;
    metadata?: PrimitiveOverrideProps<TextAreaFieldProps>;
} & EscapeHatchProps;
export declare type ProjectGroupUpdateFormProps = React.PropsWithChildren<{
    overrides?: ProjectGroupUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    projectGroup?: ProjectGroup;
    onSubmit?: (fields: ProjectGroupUpdateFormInputValues) => ProjectGroupUpdateFormInputValues;
    onSuccess?: (fields: ProjectGroupUpdateFormInputValues) => void;
    onError?: (fields: ProjectGroupUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ProjectGroupUpdateFormInputValues) => ProjectGroupUpdateFormInputValues;
    onValidate?: ProjectGroupUpdateFormValidationValues;
} & React.CSSProperties>;
export default function ProjectGroupUpdateForm(props: ProjectGroupUpdateFormProps): React.ReactElement;
