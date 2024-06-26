/*
Copyright 2022 The orchest Authors.
*/

// Code generated by client-gen. DO NOT EDIT.

package fake

import (
	v1alpha1 "github.com/TapTarget/TTO/services/orchest-controller/pkg/client/clientset/versioned/typed/orchest/v1alpha1"
	rest "k8s.io/client-go/rest"
	testing "k8s.io/client-go/testing"
)

type FakeOrchestV1alpha1 struct {
	*testing.Fake
}

func (c *FakeOrchestV1alpha1) OrchestClusters(namespace string) v1alpha1.OrchestClusterInterface {
	return &FakeOrchestClusters{c, namespace}
}

func (c *FakeOrchestV1alpha1) OrchestComponents(namespace string) v1alpha1.OrchestComponentInterface {
	return &FakeOrchestComponents{c, namespace}
}

// RESTClient returns a RESTClient that is used to communicate
// with API server by this client implementation.
func (c *FakeOrchestV1alpha1) RESTClient() rest.Interface {
	var ret *rest.RESTClient
	return ret
}
