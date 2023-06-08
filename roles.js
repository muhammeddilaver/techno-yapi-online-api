import AccessControl from 'accesscontrol';
const ac = new AccessControl();

const roles = (function () {
  ac.grant('user').readAny('allProject');
  ac.grant('admin').extend('user').createAny('allProject');

  return ac;
})();

export default roles;