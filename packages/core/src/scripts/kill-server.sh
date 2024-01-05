#!/usr/bin/env bash
pid=$(lsof -i4TCP:3005 -Fp | grep ^p | sed "s/p//")
kill $pid
