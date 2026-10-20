#!/usr/bin/env bash

# Read only the deployment variables needed from .env without shell evaluation.
load_deployment_env() {
  local env_file="$1" line key value
  [[ -f "${env_file}" ]] || return 0
  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%$'\r'}"
    [[ "${line}" == *=* ]] || continue
    key="${line%%=*}"
    case "${key}" in
      DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASSWORD|CONTRACT_STORAGE_ROOT) ;;
      *) continue ;;
    esac
    value="${line#*=}"
    if [[ "${#value}" -ge 2 && "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "${#value}" -ge 2 && "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
      value="${value:1:${#value}-2}"
    fi
    [[ ! "${value}" =~ [[:cntrl:]] ]] || return 1
    printf -v "${key}" '%s' "${value}"
  done < "${env_file}"
}
