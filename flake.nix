{
  description = "トットク — 家庭書類管理システム 開発環境";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f (import nixpkgs { inherit system; }));
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22
            pkgs.pnpm
          ];
          shellHook = ''
            echo "tottoku dev shell — node $(node -v) / pnpm $(pnpm -v)"
          '';
        };
      });
    };
}
