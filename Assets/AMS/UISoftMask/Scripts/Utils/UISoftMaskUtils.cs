using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace AMS.UI.SoftMask
{
    public abstract class UISoftMaskUtils
    {
        //UISoftMaskShader
        private const string k_DefaultSoftMaskShader = "AMS/UISoftMask";
        public const string k_DEBUG_MASK = "_DEBUG_MASK";

        public static int s_WORLDCANVAS = Shader.PropertyToID("_WORLDCANVAS");

        public static int s_SoftMaskID = Shader.PropertyToID("_SoftMask");
        public static int s_RectUvSizeID = Shader.PropertyToID("_RectUvSize");
        public static int s_WorldCanvasMatrixID = Shader.PropertyToID("_WorldCanvasMatrix");
        public static int s_OverlayCanvasMatrixID = Shader.PropertyToID("_OverlayCanvasMatrix");

        public static int s_ParentMaskID = Shader.PropertyToID("_ParentMask");
        public static int s_ParentMaskMatrixID = Shader.PropertyToID("_ParentMaskMatrix");

        public static int s_MaskDataSettingsID = Shader.PropertyToID("_MaskDataSettings");

        public static Shader s_SoftMaskShader = Shader.Find(k_DefaultSoftMaskShader);

        //UISoftMaskBlitShader
        public const string k_SoftMaskBlitShader = "Hidden/AMS/UISoftMaskBlit";
        public static Shader s_SoftMaskBlitShader = Shader.Find(k_SoftMaskBlitShader);
        public static int s_FalloffID = Shader.PropertyToID("_FallOff");
        public static int s_OpacityID = Shader.PropertyToID("_Opacity");
        public static int s_AtlasDataID = Shader.PropertyToID("_AtlasData");
        public const string k_SLICED = "_SLICED";
        public static int s_SliceScaleID = Shader.PropertyToID("_SliceScale");
        public static int s_SliceBorderID = Shader.PropertyToID("_SliceBorder");

        public const string k_SoftMaskMatTag = "SoftMaskMat[";

        public enum MaskUV
        {
            Simple,
            Sliced
        }

        [Serializable]
        internal class MaskData
        {
            internal MaskUV uvType = default;
            internal Sprite sprite = null;
            internal float pixelsPerUnitMultiplier = 0;
            internal Vector4 slicedBorder = default;
            internal Vector2 settings = default; //x: enabled | y: gamma2linear
#if UNITY_EDITOR || DEVELOPMENT_BUILD
            internal bool preview = false;
#endif

            public void SetMaterialDataSettings(Material material)
            {
                material.SetVector(s_MaskDataSettingsID, settings);
            }
        }

        public enum MaskSize
        {
            _32 = 32,
            _64 = 64,
            _128 = 128,
            _256 = 256,
            _512 = 512,
            _1024 = 1024,
            _2048 = 2048,
            _4096 = 4096
        }

        public static bool MaterialHasSoftMask(Material targetMaterial) =>
            targetMaterial && targetMaterial.HasProperty(s_SoftMaskID);

#if UNITY_EDITOR
        [MenuItem("Window/AMS/UISoftMask/Force Include Shaders (ProjectSettings)", priority = 0)]
        public static void ForceIncludeShaders()
        {
            var graphicsSettingsObj =
                AssetDatabase.LoadAssetAtPath<GraphicsSettings>(
                    "ProjectSettings/GraphicsSettings.asset");
            var serializedObject = new SerializedObject(graphicsSettingsObj);
            var includedShaderProperty = serializedObject.FindProperty("m_AlwaysIncludedShaders");
            var shaders = new List<Shader>();
            for (var i = 0; i < includedShaderProperty.arraySize; i++)
            {
                if (includedShaderProperty.GetArrayElementAtIndex(i).objectReferenceValue is Shader shader && shader)
                    shaders.Add(shader);
                else
                {
                    includedShaderProperty.DeleteArrayElementAtIndex(i);
                    i--;
                }
            }

            if (!shaders.Contains(s_SoftMaskShader))
            {
                var index = includedShaderProperty.arraySize;
                includedShaderProperty.InsertArrayElementAtIndex(index);
                var arrayElem = includedShaderProperty.GetArrayElementAtIndex(index);
                arrayElem.objectReferenceValue = s_SoftMaskShader;
            }

            if (!shaders.Contains(s_SoftMaskBlitShader))
            {
                var index = includedShaderProperty.arraySize;
                includedShaderProperty.InsertArrayElementAtIndex(index);
                var arrayElem = includedShaderProperty.GetArrayElementAtIndex(index);
                arrayElem.objectReferenceValue = s_SoftMaskBlitShader;
            }

            serializedObject.ApplyModifiedProperties();
            AssetDatabase.SaveAssets();
        }
#endif
    }
}