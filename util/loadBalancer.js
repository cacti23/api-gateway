loadBalancer = {};

loadBalancer.ROUND_ROBIN = (service) => {
  const newIndex =
    ++service.index >= service.instances.length ? 0 : service.index;

  service.index = newIndex;

  return loadBalancer.isEnabled(service, newIndex, loadBalancer.ROUND_ROBIN);
};

loadBalancer.isEnabled = (service, index, loadBalancerStrategy) => {
  return service.instances[index].enabled
    ? index
    : loadBalancerStrategy(service);
};

module.exports = loadBalancer;
