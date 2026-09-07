"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CollectionSelectOption = {
  id: string;
  name: string;
  termCount?: number;
};

type CollectionSelectLeadingOption = {
  id: string;
  label: string;
};

type CollectionSelectCommonProps = {
  id?: string;
  "aria-label"?: string;
  collections: CollectionSelectOption[];
  value: string;
  isDisabled?: boolean;
  leadingOption?: CollectionSelectLeadingOption;
  className?: string;
  triggerClassName?: string;
  size?: "sm" | "default";
};

export type CollectionSelectProps =
  | (CollectionSelectCommonProps & { mode: "local"; onChange: (id: string) => void })
  | (CollectionSelectCommonProps & { mode: "url"; hrefBuilder: (id: string) => string });

function optionLabel(collection: CollectionSelectOption) {
  return collection.termCount === undefined
    ? collection.name
    : `${collection.name} (${collection.termCount})`;
}

export function CollectionSelect(props: CollectionSelectProps) {
  const {
    id,
    collections,
    value,
    isDisabled,
    leadingOption,
    className,
    triggerClassName,
    size,
    "aria-label": ariaLabel,
  } = props;
  const router = useRouter();

  function handleChange(nextId: string) {
    if (props.mode === "url") {
      router.push(props.hrefBuilder(nextId));
    } else {
      props.onChange(nextId);
    }
  }

  return (
    <Select
      className={className}
      value={value}
      isDisabled={isDisabled}
      onChange={(key) => {
        if (key == null) return;
        handleChange(String(key));
      }}
    >
      <SelectTrigger id={id} size={size} aria-label={ariaLabel} className={triggerClassName}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {leadingOption ? (
          <SelectItem id={leadingOption.id}>{leadingOption.label}</SelectItem>
        ) : null}
        {collections.map((collection) => (
          <SelectItem key={collection.id} id={collection.id}>
            {optionLabel(collection)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
