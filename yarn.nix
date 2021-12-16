{ fetchurl, fetchgit, linkFarm, runCommandNoCC, gnutar }: rec {
  offline_cache = linkFarm "offline" packages;
  packages = [
    {
      name = "argparse___argparse_2.0.1.tgz";
      path = fetchurl {
        name = "argparse___argparse_2.0.1.tgz";
        url  = "https://registry.yarnpkg.com/argparse/-/argparse-2.0.1.tgz";
        sha1 = "246f50f3ca78a3240f6c997e8a9bd1eac49e4b38";
      };
    }
    {
      name = "biwascheme___biwascheme_0.7.4.tgz";
      path = fetchurl {
        name = "biwascheme___biwascheme_0.7.4.tgz";
        url  = "https://registry.yarnpkg.com/biwascheme/-/biwascheme-0.7.4.tgz";
        sha1 = "4c6fa17dcda81274baf5c3ca5f957312818e7576";
      };
    }
    {
      name = "optparse___optparse_1.0.5.tgz";
      path = fetchurl {
        name = "optparse___optparse_1.0.5.tgz";
        url  = "https://registry.yarnpkg.com/optparse/-/optparse-1.0.5.tgz";
        sha1 = "75e75a96506611eb1c65ba89018ff08a981e2c16";
      };
    }
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
