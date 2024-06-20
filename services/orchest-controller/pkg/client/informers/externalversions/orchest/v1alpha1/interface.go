/*
Copyright 2022 The orchest Authors.
*/

// Code generated by informer-gen. DO NOT EDIT.

package v1alpha1

import (
	internalinterfaces "github.com/TapTarget/TTO/services/orchest-controller/pkg/client/informers/externalversions/internalinterfaces"
)

// Interface provides access to all the informers in this group version.
type Interface interface {
	// OrchestClusters returns a OrchestClusterInformer.
	OrchestClusters() OrchestClusterInformer
	// OrchestComponents returns a OrchestComponentInformer.
	OrchestComponents() OrchestComponentInformer
}

type version struct {
	factory          internalinterfaces.SharedInformerFactory
	namespace        string
	tweakListOptions internalinterfaces.TweakListOptionsFunc
}

// New returns a new Interface.
func New(f internalinterfaces.SharedInformerFactory, namespace string, tweakListOptions internalinterfaces.TweakListOptionsFunc) Interface {
	return &version{factory: f, namespace: namespace, tweakListOptions: tweakListOptions}
}

// OrchestClusters returns a OrchestClusterInformer.
func (v *version) OrchestClusters() OrchestClusterInformer {
	return &orchestClusterInformer{factory: v.factory, namespace: v.namespace, tweakListOptions: v.tweakListOptions}
}

// OrchestComponents returns a OrchestComponentInformer.
func (v *version) OrchestComponents() OrchestComponentInformer {
	return &orchestComponentInformer{factory: v.factory, namespace: v.namespace, tweakListOptions: v.tweakListOptions}
}
