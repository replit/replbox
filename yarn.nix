{ fetchurl, fetchgit, linkFarm, runCommandNoCC, gnutar }: rec {
  offline_cache = linkFarm "offline" packages;
  packages = [
    {
      name = "prettier___prettier_1.19.1.tgz";
      path = fetchurl {
        name = "prettier___prettier_1.19.1.tgz";
        url  = "https://registry.yarnpkg.com/prettier/-/prettier-1.19.1.tgz";
        sha1 = "f7d7f5ff8a9cd872a7be4ca142095956a60797cb";
      };
    }
    {
      name = "underscore___underscore_1.2.2.tgz";
      path = fetchurl {
        name = "underscore___underscore_1.2.2.tgz";
        url  = "https://registry.yarnpkg.com/underscore/-/underscore-1.2.2.tgz";
        sha1 = "74dd40e9face84e724eb2edae945b8aedc233ba3";
      };
    }
  ];
}
