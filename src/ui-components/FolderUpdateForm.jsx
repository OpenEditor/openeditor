/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import {
  Button,
  Flex,
  Grid,
  TextAreaField,
  TextField,
} from "@aws-amplify/ui-react";
import { Folder } from "../models";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { DataStore } from "aws-amplify";
export default function FolderUpdateForm(props) {
  const {
    id: idProp,
    folder: folderModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    parent: "",
    title: "",
    status: "",
    metadata: "",
    project: "",
  };
  const [parent, setParent] = React.useState(initialValues.parent);
  const [title, setTitle] = React.useState(initialValues.title);
  const [status, setStatus] = React.useState(initialValues.status);
  const [metadata, setMetadata] = React.useState(initialValues.metadata);
  const [project, setProject] = React.useState(initialValues.project);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = folderRecord
      ? { ...initialValues, ...folderRecord }
      : initialValues;
    setParent(cleanValues.parent);
    setTitle(cleanValues.title);
    setStatus(
      typeof cleanValues.status === "string" || cleanValues.status === null
        ? cleanValues.status
        : JSON.stringify(cleanValues.status)
    );
    setMetadata(
      typeof cleanValues.metadata === "string" || cleanValues.metadata === null
        ? cleanValues.metadata
        : JSON.stringify(cleanValues.metadata)
    );
    setProject(cleanValues.project);
    setErrors({});
  };
  const [folderRecord, setFolderRecord] = React.useState(folderModelProp);
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? await DataStore.query(Folder, idProp)
        : folderModelProp;
      setFolderRecord(record);
    };
    queryData();
  }, [idProp, folderModelProp]);
  React.useEffect(resetStateValues, [folderRecord]);
  const validations = {
    parent: [],
    title: [{ type: "Required" }],
    status: [{ type: "Required" }, { type: "JSON" }],
    metadata: [{ type: "Required" }, { type: "JSON" }],
    project: [],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue;
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
          parent,
          title,
          status,
          metadata,
          project,
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
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === "string" && value === "") {
              modelFields[key] = null;
            }
          });
          await DataStore.save(
            Folder.copyOf(folderRecord, (updated) => {
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
      {...getOverrideProps(overrides, "FolderUpdateForm")}
      {...rest}
    >
      <TextField
        label="Parent"
        isRequired={false}
        isReadOnly={false}
        value={parent}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              parent: value,
              title,
              status,
              metadata,
              project,
            };
            const result = onChange(modelFields);
            value = result?.parent ?? value;
          }
          if (errors.parent?.hasError) {
            runValidationTasks("parent", value);
          }
          setParent(value);
        }}
        onBlur={() => runValidationTasks("parent", parent)}
        errorMessage={errors.parent?.errorMessage}
        hasError={errors.parent?.hasError}
        {...getOverrideProps(overrides, "parent")}
      ></TextField>
      <TextField
        label="Title"
        isRequired={true}
        isReadOnly={false}
        value={title}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              parent,
              title: value,
              status,
              metadata,
              project,
            };
            const result = onChange(modelFields);
            value = result?.title ?? value;
          }
          if (errors.title?.hasError) {
            runValidationTasks("title", value);
          }
          setTitle(value);
        }}
        onBlur={() => runValidationTasks("title", title)}
        errorMessage={errors.title?.errorMessage}
        hasError={errors.title?.hasError}
        {...getOverrideProps(overrides, "title")}
      ></TextField>
      <TextAreaField
        label="Status"
        isRequired={true}
        isReadOnly={false}
        value={status}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              parent,
              title,
              status: value,
              metadata,
              project,
            };
            const result = onChange(modelFields);
            value = result?.status ?? value;
          }
          if (errors.status?.hasError) {
            runValidationTasks("status", value);
          }
          setStatus(value);
        }}
        onBlur={() => runValidationTasks("status", status)}
        errorMessage={errors.status?.errorMessage}
        hasError={errors.status?.hasError}
        {...getOverrideProps(overrides, "status")}
      ></TextAreaField>
      <TextAreaField
        label="Metadata"
        isRequired={true}
        isReadOnly={false}
        value={metadata}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              parent,
              title,
              status,
              metadata: value,
              project,
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
      <TextField
        label="Project"
        isRequired={false}
        isReadOnly={false}
        value={project}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              parent,
              title,
              status,
              metadata,
              project: value,
            };
            const result = onChange(modelFields);
            value = result?.project ?? value;
          }
          if (errors.project?.hasError) {
            runValidationTasks("project", value);
          }
          setProject(value);
        }}
        onBlur={() => runValidationTasks("project", project)}
        errorMessage={errors.project?.errorMessage}
        hasError={errors.project?.hasError}
        {...getOverrideProps(overrides, "project")}
      ></TextField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Reset"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          isDisabled={!(idProp || folderModelProp)}
          {...getOverrideProps(overrides, "ResetButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={
              !(idProp || folderModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
