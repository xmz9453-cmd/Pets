const ROLE_LABELS = {
  OWNER: '管理者',
  FRONT_DESK: '櫃台',
  GROOMER: '美容師',
};

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}

module.exports = {
  getRoleLabel,
};