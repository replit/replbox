with (import <nixpkgs> {});
rec {
  muellshack = mkYarnPackage {
    name = "replbox";
    src = ./.;
    packageJSON = ./package.json;
    yarnLock = ./yarn.lock;
    yarnNix = ./yarn.nix;
  };
}
