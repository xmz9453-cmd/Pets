#!/usr/bin/env bash

# Create a private MySQL option file without placing the password in the
# environment or in process arguments. The caller owns and removes the file.
write_mysql_client_defaults() {
  local option_file="$1" value escaped key
  local -A options=(
    [host]="${DB_HOST}"
    [port]="${DB_PORT}"
    [user]="${DB_USER}"
    [password]="${DB_PASSWORD}"
  )

  for key in host port user password; do
    value="${options[$key]}"
    [[ ! "${value}" =~ [[:cntrl:]] ]] || return 1
    escaped="${value//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    options[$key]="${escaped}"
  done

  umask 077
  (
    set -o noclobber
    {
      printf '[client]\n'
      for key in host port user password; do
        printf '%s="%s"\n' "${key}" "${options[$key]}"
      done
    } > "${option_file}"
  ) || return 1
  chmod 600 -- "${option_file}"
}
