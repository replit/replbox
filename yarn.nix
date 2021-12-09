{ fetchurl, fetchgit, linkFarm, runCommandNoCC, gnutar }: rec {
  offline_cache = linkFarm "offline" packages;
  packages = [
    {
      name = "ansi_regex___ansi_regex_4.1.0.tgz";
      path = fetchurl {
        name = "ansi_regex___ansi_regex_4.1.0.tgz";
        url  = "https://registry.yarnpkg.com/ansi-regex/-/ansi-regex-4.1.0.tgz";
        sha1 = "8b9f8f08cf1acb843756a839ca8c7e3168c51997";
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
      name = "prompt_sync___prompt_sync_4.2.0.tgz";
      path = fetchurl {
        name = "prompt_sync___prompt_sync_4.2.0.tgz";
        url  = "https://registry.yarnpkg.com/prompt-sync/-/prompt-sync-4.2.0.tgz";
        sha1 = "0198f73c5b70e3b03e4b9033a50540a7c9a1d7f4";
      };
    }
    {
      name = "strip_ansi___strip_ansi_5.2.0.tgz";
      path = fetchurl {
        name = "strip_ansi___strip_ansi_5.2.0.tgz";
        url  = "https://registry.yarnpkg.com/strip-ansi/-/strip-ansi-5.2.0.tgz";
        sha1 = "8c9a536feb6afc962bdfa5b104a5091c1ad9c0ae";
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
