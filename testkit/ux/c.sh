#!/bin/bash
D=$(dirname "$0"); n=$(date +%s%N); cat > $D/q/$n.tmp; mv $D/q/$n.tmp $D/q/$n.py
for i in $(seq 1 600); do [ -f $D/q/$n.out ] && { cat $D/q/$n.out; rm $D/q/$n.out; exit; }; sleep 0.25; done; echo TIMEOUT
