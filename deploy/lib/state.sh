#!/usr/bin/env bash

# Parse the deployment state as data. Never evaluate the file as shell code.
declare -Ag DEPLOY_STATE=()

read_deployment_state() {
  local state_file="$1" line key value required expected_log_dir log_basename
  DEPLOY_STATE=()
  [[ -f "${state_file}" && ! -L "${state_file}" ]] || return 1

  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ "${line}" =~ ^([a-z_]+)=(.*)$ ]] || return 1
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    case "${key}" in
      status|commit|previous_commit|timestamp|backup|verification|log_file|verified_at) ;;
      *) return 1 ;;
    esac
    [[ -z "${DEPLOY_STATE[${key}]+present}" ]] || return 1
    [[ ! "${value}" =~ [[:cntrl:]] ]] || return 1
    [[ -n "${value}" ]] || return 1
    DEPLOY_STATE["${key}"]="${value}"
  done < "${state_file}"

  for required in status commit previous_commit timestamp backup verification log_file; do
    [[ -n "${DEPLOY_STATE[${required}]:-}" ]] || return 1
  done
  [[ "${DEPLOY_STATE[timestamp]}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+08:00$ ]] || return 1
  [[ "${DEPLOY_STATE[previous_commit]}" =~ ^(NONE|[0-9a-fA-F]{40})$ ]] || return 1
  expected_log_dir="${state_file%/*}/logs/"
  [[ "${DEPLOY_STATE[log_file]}" == "${expected_log_dir}"* ]] || return 1
  log_basename="${DEPLOY_STATE[log_file]#"${expected_log_dir}"}"
  [[ "${log_basename}" =~ ^deploy-[0-9]{8}-[0-9]{6}\.log$ ]] || return 1
  [[ "${DEPLOY_STATE[backup]}" == NONE || "${DEPLOY_STATE[backup]}" == pending || "${DEPLOY_STATE[backup]}" == /* ]] || return 1

  local has_commit=false has_backup=false
  [[ "${DEPLOY_STATE[commit]}" =~ ^[0-9a-fA-F]{40}$ ]] && has_commit=true
  [[ "${DEPLOY_STATE[backup]}" == /* ]] && has_backup=true
  case "${DEPLOY_STATE[status]}" in
    RUNNING)
      [[ "${has_commit}" == true && "${DEPLOY_STATE[verification]}" == pending &&
        ( "${DEPLOY_STATE[backup]}" == pending || "${has_backup}" == true ) ]] || return 1 ;;
    FAILED)
      [[ ( "${DEPLOY_STATE[commit]}" == NONE || "${has_commit}" == true ) &&
        "${DEPLOY_STATE[verification]}" == failed ]] || return 1 ;;
    DEPLOYED)
      [[ "${has_commit}" == true && "${has_backup}" == true && "${DEPLOY_STATE[verification]}" == pending ]] || return 1 ;;
    SUCCESS)
      [[ "${has_commit}" == true && "${has_backup}" == true && "${DEPLOY_STATE[verification]}" == PASS &&
        "${DEPLOY_STATE[verified_at]:-}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+08:00$ ]] || return 1 ;;
    *) return 1 ;;
  esac
  if [[ "${DEPLOY_STATE[status]}" != SUCCESS && -n "${DEPLOY_STATE[verified_at]:-}" ]]; then return 1; fi
  return 0
}
