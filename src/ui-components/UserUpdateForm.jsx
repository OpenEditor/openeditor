/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import { fetchByPath, validateField } from "./utils";
import { User } from "../models";
import { getOverrideProps } from "@aws-amplify/ui-react/internal";
import {
  Button,
  Flex,
  Grid,
  TextAreaField,
  TextField,
} from "@aws-amplify/ui-react";
import { DataStore } from "aws-amplify";
export default function UserUpdateForm(props) {
  const {
    id,
    user,
    onSuccess,
    onError,
    onSubmit,
    onCancel,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    identityId: undefined,
    cognitoUsername: undefined,
    email: undefined,
    name: undefined,
    metadata: undefined,
  };
  const [identityId, setIdentityId] = React.useState(initialValues.identityId);
  const [cognitoUsername, setCognitoUsername] = React.useState(
    initialValues.cognitoUsername
  );
  const [email, setEmail] = React.useState(initialValues.email);
  const [name, setName] = React.useState(initialValues.name);
  const [metadata, setMetadata] = React.useState(
    initialValues.metadata ? JSON.stringify(initialValues.metadata) : undefined
  );
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = { ...initialValues, ...userRecord };
    setIdentityId(cleanValues.identityId);
    setCognitoUsername(cleanValues.cognitoUsername);
    setEmail(cleanValues.email);
    setName(cleanValues.name);
    setMetadata(cleanValues.metadata);
    setErrors({});
  };
  const [userRecord, setUserRecord] = React.useState(user);
  React.useEffect(() => {
    const queryData = async () => {
      const record = id ? await DataStore.query(User, id) : user;
      setUserRecord(record);
    };
    queryData();
  }, [id, user]);
  React.useEffect(resetStateValues, [userRecord]);
  const validations = {
    identityId: [{ type: "Required" }],
    cognitoUsername: [{ type: "Required" }],
    email: [{ type: "Required" }],
    name: [{ type: "Required" }],
    metadata: [{ type: "Required" }, { type: "JSON" }],
  };
  const runValidationTasks = async (fieldName, value) => {
    let validationResponse = validateField(value, validations[fieldName]);
    const customValidator = fetchByPath(onValidate, fieldName);
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse);
    }
    setErrors((errors) => ({ ...errors, [fieldName]: validationResponse }));
    return validationResponse;
  };
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async (event) => {
        event.preventDefault();
        let modelFields = {
          identityId,
          cognitoUsername,
          email,
          name,
          metadata,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item)
                )
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName])
            );
            return promises;
          }, [])
        );
        if (validationResponses.some((r) => r.hasError)) {
          return;
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields);
        }
        try {
          await DataStore.save(
            User.copyOf(userRecord, (updated) => {
              Object.assign(updated, modelFields);
            })
          );
          if (onSuccess) {
            onSuccess(modelFields);
          }
        } catch (err) {
          if (onError) {
            onError(modelFields, err.message);
          }
        }
      }}
      {...rest}
      {...getOverrideProps(overrides, "UserUpdateForm")}
    >
      <TextField
        label="Identity id"
        isRequired={true}
        isReadOnly={false}
        defaultValue={identityId}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              identityId: value,
              cognitoUsername,
              email,
              name,
              metadata,
            };
            const result = onChange(modelFields);
            value = result?.identityId ?? value;
          }
          if (errors.identityId?.hasError) {
            runValidationTasks("identityId", value);
          }
          setIdentityId(value);
        }}
        onBlur={() => runValidationTasks("identityId", identityId)}
        errorMessage={errors.identityId?.errorMessage}
        hasError={errors.identityId?.hasError}
        {...getOverrideProps(overrides, "identityId")}
      ></TextField>
      <TextField
        label="Cognito username"
        isRequired={true}
        isReadOnly={false}
        defaultValue={cognitoUsername}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              identityId,
              cognitoUsername: value,
              email,
              name,
              metadata,
            };
            const result = onChange(modelFields);
            value = result?.cognitoUsername ?? value;
          }
          if (errors.cognitoUsername?.hasError) {
            runValidationTasks("cognitoUsername", value);
          }
          setCognitoUsername(value);
        }}
        onBlur={() => runValidationTasks("cognitoUsername", cognitoUsername)}
        errorMessage={errors.cognitoUsername?.errorMessage}
        hasError={errors.cognitoUsername?.hasError}
        {...getOverrideProps(overrides, "cognitoUsername")}
      ></TextField>
      <TextField
        label="Email"
        isRequired={true}
        isReadOnly={false}
        defaultValue={email}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              identityId,
              cognitoUsername,
              email: value,
              name,
              metadata,
            };
            const result = onChange(modelFields);
            value = result?.email ?? value;
          }
          if (errors.email?.hasError) {
            runValidationTasks("email", value);
          }
          setEmail(value);
        }}
        onBlur={() => runValidationTasks("email", email)}
        errorMessage={errors.email?.errorMessage}
        hasError={errors.email?.hasError}
        {...getOverrideProps(overrides, "email")}
      ></TextField>
      <TextField
        label="Name"
        isRequired={true}
        isReadOnly={false}
        defaultValue={name}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              identityId,
              cognitoUsername,
              email,
              name: value,
              metadata,
            };
            const result = onChange(modelFields);
            value = result?.name ?? value;
          }
          if (errors.name?.hasError) {
            runValidationTasks("name", value);
          }
          setName(value);
        }}
        onBlur={() => runValidationTasks("name", name)}
        errorMessage={errors.name?.errorMessage}
        hasError={errors.name?.hasError}
        {...getOverrideProps(overrides, "name")}
      ></TextField>
      <TextAreaField
        label="Metadata"
        isRequired={true}
        isReadOnly={false}
        defaultValue={metadata}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              identityId,
              cognitoUsername,
              email,
              name,
              metadata: value,
            };
            const result = onChange(modelFields);
            value = result?.metadata ?? value;
          }
          if (errors.metadata?.hasError) {
            runValidationTasks("metadata", value);
          }
          setMetadata(value);
        }}
        onBlur={() => runValidationTasks("metadata", metadata)}
        errorMessage={errors.metadata?.errorMessage}
        hasError={errors.metadata?.hasError}
        {...getOverrideProps(overrides, "metadata")}
      ></TextAreaField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Reset"
          type="reset"
          onClick={resetStateValues}
          {...getOverrideProps(overrides, "ResetButton")}
        ></Button>
        <Flex {...getOverrideProps(overrides, "RightAlignCTASubFlex")}>
          <Button
            children="Cancel"
            type="button"
            onClick={() => {
              onCancel && onCancel();
            }}
            {...getOverrideProps(overrides, "CancelButton")}
          ></Button>
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={Object.values(errors).some((e) => e?.hasError)}
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}