import AccessControl from 'accesscontrol';
const ac = new AccessControl();

const roles = (function () {
  ac.grant('user').readAny('product');
  ac.grant('admin').extend('user').createAny('product');

  return ac;
})();

export default roles;