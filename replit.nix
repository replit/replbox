{ pkgs }: {
	deps = [
		pkgs.yarn2nix
  pkgs.nodejs-16_x
        pkgs.nodePackages.typescript-language-server
        pkgs.yarn
        pkgs.replitPackages.jest
	];
}